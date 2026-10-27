import io
import re
import time
import unicodedata
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from PIL import Image
import numpy as np
import pymupdf
import cv2
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.processing_run import ProcessingRun
from app.models.document_page import DocumentPage
from app.services.storage import resolve_storage_path
from app.services.audit import record_audit_event
from app.services.preprocessing import preprocess_scanned_image

# Configuration constants
MIN_TEXT_CHARS = 50
MAX_PAGES = 30
MAX_PIXELS = 40_000_000  # 40 MP safeguard against decompression bombs

_ocr_engine = None


def get_ocr_engine():
    """Lazy initialize RapidOCR engine singleton."""
    global _ocr_engine
    if _ocr_engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _ocr_engine = RapidOCR()
    return _ocr_engine


def clean_extracted_text(text: Optional[str]) -> Optional[str]:
    """Conservative text normalization for regulatory & application documents:
    - Unicode NFKC normalization
    - De-hyphenate line-break hyphens without destroying intentional dashes
    - Collapse repeated spaces and tabs while preserving newlines
    """
    if not text:
        return None

    # 1. Unicode NFKC normalization
    normalized = unicodedata.normalize("NFKC", text)

    # 2. Normalize line endings
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")

    # 3. De-hyphenate line break words (e.g. "insti-\ntution" -> "institution")
    dehyphenated = re.sub(r'(\b\w+)-\n(\w+\b)', r'\1\2', normalized)

    # 4. Collapse horizontal whitespace per line
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in dehyphenated.split('\n')]

    # 5. Collapse excessive blank lines (> 2)
    cleaned = re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip()
    return cleaned if cleaned else None


def extract_tables_from_page(page: pymupdf.Page) -> List[Dict[str, Any]]:
    """Extract structured tables from a digital PDF page using PyMuPDF find_tables().
    Preserves exact bounding box and cell values.
    Returns empty list if no tables are found or on pages without vectors.
    """
    tables: List[Dict[str, Any]] = []
    if not hasattr(page, "find_tables"):
        return tables

    try:
        # First attempt vector lines strategy
        tabs = page.find_tables(strategy="lines")
        if not tabs.tables:
            # Fallback to text strategy
            tabs = page.find_tables(strategy="text")

        for tab in tabs:
            extracted = tab.extract()
            if not extracted:
                continue

            cleaned_rows: List[List[Optional[str]]] = []
            for row in extracted:
                cleaned_row = [
                    re.sub(r"\s+", " ", cell).strip() if cell and isinstance(cell, str) and cell.strip() else None
                    for cell in row
                ]
                if any(cleaned_row):
                    cleaned_rows.append(cleaned_row)

            if not cleaned_rows:
                continue

            headers = cleaned_rows[0] if len(cleaned_rows) > 1 else []
            data_rows = cleaned_rows[1:] if len(cleaned_rows) > 1 else cleaned_rows

            bbox_dict = {
                "x0": round(float(tab.bbox[0]), 2),
                "y0": round(float(tab.bbox[1]), 2),
                "x1": round(float(tab.bbox[2]), 2),
                "y1": round(float(tab.bbox[3]), 2),
            }

            tables.append({
                "bbox": bbox_dict,
                "headers": headers,
                "rows": data_rows,
                "row_count": len(data_rows),
                "col_count": max((len(r) for r in cleaned_rows), default=0),
            })
    except Exception:
        # Structured table extraction failure should never crash the main extraction pipeline
        pass

    return tables


def extract_tables_from_raster(
    image_np: np.ndarray,
    ocr_lines: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Extract structured tables from scanned pages or raster images using OpenCV morphological
    line analysis paired with RapidOCR line spatial coordinates.
    Produces tables adhering to the standard schema:
    {
        'bbox': {'x0': ..., 'y0': ..., 'x1': ..., 'y1': ...},
        'headers': [...],
        'rows': [...],
        'row_count': int,
        'col_count': int,
        'table_source': 'SCANNED_MORPHOLOGICAL_CV',
    }
    """
    tables: List[Dict[str, Any]] = []
    if image_np is None or image_np.size == 0 or not ocr_lines:
        return tables

    try:
        if len(image_np.shape) == 3:
            gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        else:
            gray = image_np

        h, w = gray.shape[:2]
        # Otsu inverse binarization
        _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

        # Detect horizontal gridlines
        h_len = max(20, w // 40)
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_len, 1))
        h_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, h_kernel, iterations=2)

        # Detect vertical gridlines
        v_len = max(15, h // 40)
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_len))
        v_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, v_kernel, iterations=2)

        grid = cv2.add(h_lines, v_lines)
        contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        table_candidates = []
        cell_candidates = []
        for c in contours:
            x, y, cw, ch = cv2.boundingRect(c)
            if cw >= w * 0.40 and ch >= 70:
                table_candidates.append((x, y, cw, ch))
            if cw >= 20 and ch >= 12 and (cw < w * 0.95 or ch < h * 0.90):
                cell_candidates.append((x, y, cw, ch))

        for (tx, ty, tw, th) in table_candidates:
            # Collect cell boxes strictly inside this table candidate
            t_cells = [
                (cx, cy, cw, ch)
                for (cx, cy, cw, ch) in cell_candidates
                if cx >= tx - 5 and cy >= ty - 5 and (cx + cw) <= (tx + tw + 5) and (cy + ch) <= (ty + th + 5)
                and not (abs(cx - tx) < 10 and abs(cy - ty) < 10 and abs(cw - tw) < 10 and abs(ch - th) < 10)
            ]

            if len(t_cells) < 4:  # Must have at least a 2x2 grid
                continue

            # Group cells by row (Y-center proximity)
            t_cells.sort(key=lambda b: (b[1], b[0]))
            rows_cells: List[List[Tuple[int, int, int, int]]] = []
            row_y_threshold = max(12, int(th / 30))

            for cell in t_cells:
                cy_center = cell[1] + cell[3] // 2
                placed = False
                for r in rows_cells:
                    r_y_center = r[0][1] + r[0][3] // 2
                    if abs(cy_center - r_y_center) <= row_y_threshold:
                        r.append(cell)
                        placed = True
                        break
                if not placed:
                    rows_cells.append([cell])

            rows_cells.sort(key=lambda r: r[0][1])

            reconstructed_rows: List[List[Optional[str]]] = []
            for r in rows_cells:
                r.sort(key=lambda c: c[0])
                row_texts = []
                for (cx, cy, cw, ch) in r:
                    cell_text_parts = []
                    for line in ocr_lines:
                        bbox = line.get("bounding_box")
                        if not bbox:
                            continue
                        lx = (bbox["x0"] + bbox["x1"]) / 2.0
                        ly = (bbox["y0"] + bbox["y1"]) / 2.0
                        if cx <= lx <= (cx + cw) and cy <= ly <= (cy + ch):
                            cell_text_parts.append(line.get("text", ""))
                    cell_str = " ".join(cell_text_parts).strip()
                    row_texts.append(cell_str if cell_str else None)

                if any(row_texts):
                    reconstructed_rows.append(row_texts)

            if len(reconstructed_rows) >= 2:
                headers = [str(c) if c else "" for c in reconstructed_rows[0]]
                data_rows = reconstructed_rows[1:]
                tables.append({
                    "bbox": {
                        "x0": round(float(tx), 2),
                        "y0": round(float(ty), 2),
                        "x1": round(float(tx + tw), 2),
                        "y1": round(float(ty + th), 2),
                    },
                    "headers": headers,
                    "rows": data_rows,
                    "row_count": len(data_rows),
                    "col_count": max((len(r) for r in reconstructed_rows), default=0),
                    "table_source": "SCANNED_MORPHOLOGICAL_CV",
                })
    except Exception:
        pass

    return tables


def detect_visual_stamps_and_signatures(
    image_np: np.ndarray,
) -> Dict[str, Any]:
    """Detect probable visual presence of ink seals/stamps and signatures in scanned documents.
    IMPORTANT: This detects visual artifacts ONLY. It does not establish legal authenticity or signatory identity.
    """
    report: Dict[str, Any] = {
        "visual_stamp_detected": False,
        "stamp_bounding_box": None,
        "visual_signature_detected": False,
        "signature_bounding_box": None,
        "cryptographically_verified": False,
        "legal_authenticity_confirmed": False,
        "disclaimer": (
            "Visual stamp/signature detection identifies visual artifact presence only. "
            "It does NOT establish legal validity, signatory authority, or document authenticity."
        ),
    }

    if image_np is None or image_np.size == 0:
        return report

    try:
        h, w = image_np.shape[:2]

        # 1. Detect Blue / Violet / Red ink stamps via HSV color segmentation
        if len(image_np.shape) == 3 and image_np.shape[2] == 3:
            hsv = cv2.cvtColor(image_np, cv2.COLOR_RGB2HSV)

            # Blue / purple ink stamps (common for official institutional seals in India)
            lower_blue = np.array([100, 45, 45])
            upper_blue = np.array([150, 255, 255])
            mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)

            # Red ink stamps
            lower_red1 = np.array([0, 70, 50])
            upper_red1 = np.array([10, 255, 255])
            lower_red2 = np.array([170, 70, 50])
            upper_red2 = np.array([180, 255, 255])
            mask_red = cv2.bitwise_or(cv2.inRange(hsv, lower_red1, upper_red1), cv2.inRange(hsv, lower_red2, upper_red2))

            stamp_mask = cv2.bitwise_or(mask_blue, mask_red)
            stamp_contours, _ = cv2.findContours(stamp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for c in stamp_contours:
                x, y, cw, ch = cv2.boundingRect(c)
                # Stamps are typically round, oval, or square with dimensions > 30px and aspect ratio ~ 0.5 - 2.0
                if cw > 35 and ch > 35 and 0.4 < (cw / ch) < 2.5 and (cw * ch) < (w * h * 0.25):
                    report["visual_stamp_detected"] = True
                    report["stamp_bounding_box"] = {
                        "x0": round(float(x), 2),
                        "y0": round(float(y), 2),
                        "x1": round(float(x + cw), 2),
                        "y1": round(float(y + ch), 2),
                    }
                    break

        # 2. Detect handwritten signature presence in lower document quadrant
        # Signature block typically resides in the bottom 35% of institutional documents
        sig_y_start = int(h * 0.65)
        sig_roi = image_np[sig_y_start:, :]
        if sig_roi.size > 0:
            if len(sig_roi.shape) == 3:
                gray_sig = cv2.cvtColor(sig_roi, cv2.COLOR_RGB2GRAY)
            else:
                gray_sig = sig_roi

            # Detect high-gradient cursive ink strokes
            _, thresh_sig = cv2.threshold(gray_sig, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            sig_contours, _ = cv2.findContours(thresh_sig, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for sc in sig_contours:
                sx, sy, sw, sh = cv2.boundingRect(sc)
                peri = cv2.arcLength(sc, True)
                area = cv2.contourArea(sc)
                # Signatures have high perimeter relative to area (cursive loops) and reasonable width
                if sw > 40 and sh > 15 and area > 100 and peri > 120:
                    report["visual_signature_detected"] = True
                    report["signature_bounding_box"] = {
                        "x0": round(float(sx), 2),
                        "y0": round(float(sig_y_start + sy), 2),
                        "x1": round(float(sx + sw), 2),
                        "y1": round(float(sig_y_start + sy + sh), 2),
                    }
                    break

    except Exception:
        pass

    return report


def find_spatial_neighbor_box(
    label_line: Dict[str, Any],
    ocr_lines: List[Dict[str, Any]],
    page_width: float = 1000.0,
) -> Optional[Dict[str, Any]]:
    """Find adjacent OCR line to the right or below a detected label line using spatial bounding box geometry."""
    l_box = label_line.get("bounding_box")
    if not l_box:
        return None

    l_cy = (l_box["y0"] + l_box["y1"]) / 2.0
    l_h = l_box["y1"] - l_box["y0"]

    candidates = []
    for other in ocr_lines:
        if other is label_line:
            continue
        if other.get("line_index") is not None and label_line.get("line_index") is not None:
            if other.get("line_index") == label_line.get("line_index"):
                continue
        elif other.get("bounding_box") == l_box:
            continue
        o_box = other.get("bounding_box")
        if not o_box:
            continue
        o_cy = (o_box["y0"] + o_box["y1"]) / 2.0

        # 1. Horizontal Neighbor (to the right on same vertical baseline)
        if o_box["x0"] >= (l_box["x1"] - 10) and (o_box["x0"] - l_box["x1"]) < (page_width * 0.45):
            if abs(o_cy - l_cy) <= max(18.0, l_h * 0.85):
                dist = o_box["x0"] - l_box["x1"]
                candidates.append((dist, "HORIZONTAL", other))

        # 2. Vertical Neighbor (directly underneath label line)
        if o_box["y0"] >= (l_box["y1"] - 5) and (o_box["y0"] - l_box["y1"]) < max(40.0, l_h * 2.5):
            if not (o_box["x1"] < l_box["x0"] or o_box["x0"] > l_box["x1"]):
                dist = o_box["y0"] - l_box["y1"]
                candidates.append((dist + 50.0, "VERTICAL", other))

    if not candidates:
        return None

    candidates.sort(key=lambda c: c[0])
    best = candidates[0]
    return {
        "direction": best[1],
        "bounding_box": best[2].get("bounding_box"),
        "polygon": best[2].get("polygon"),
        "confidence": best[2].get("confidence"),
        "text": best[2].get("text"),
    }


def extract_structured_fields_from_tables(
    tables: List[Dict[str, Any]],
    page_number: int,
) -> List[Dict[str, Any]]:
    """Parse structured fields from tabular room schedules, land records, and faculty rosters.
    Preserves provenance: bounding box, source headers, row snippet, and table coordinates.
    """
    fields: List[Dict[str, Any]] = []
    seen_keys = set()

    for tab_idx, tab in enumerate(tables):
        bbox = tab.get("bbox")
        headers = [str(h).lower() if h else "" for h in tab.get("headers", [])]
        rows = tab.get("rows", [])
        table_method = "TABLE_CELL_PARSER" if tab.get("table_source") == "SCANNED_MORPHOLOGICAL_CV" else "TABLE_PYMUPDF"
        table_basis = "SCANNED_TABLE" if tab.get("table_source") == "SCANNED_MORPHOLOGICAL_CV" else "DIGITAL_TABLE"

        area_col_idx = None
        for idx, h in enumerate(headers):
            if any(term in h for term in ("area", "carpet", "sqm", "sq.m", "acres", "size")):
                area_col_idx = idx
                break

        count_col_idx = None
        for idx, h in enumerate(headers):
            if any(term in h for term in ("count", "number", "qty", "quantity", "nos")):
                count_col_idx = idx
                break

        for row_idx, row in enumerate(rows):
            row_str = " | ".join(str(c) for c in row if c is not None)
            row_lower = row_str.lower()

            def get_area_value(r: List[Optional[str]]) -> Optional[float]:
                if area_col_idx is not None and area_col_idx < len(r) and r[area_col_idx]:
                    m = re.search(r"([0-9]+(?:\.[0-9]+)?)", str(r[area_col_idx]))
                    if m:
                        try:
                            return float(m.group(1))
                        except ValueError:
                            pass
                numbers = []
                for c in r:
                    if c:
                        matches = re.findall(r"([0-9]+(?:\.[0-9]+)?)", str(c))
                        for match_str in matches:
                            try:
                                numbers.append(float(match_str))
                            except ValueError:
                                pass
                return max(numbers) if numbers else None

            def get_count_value(r: List[Optional[str]]) -> Optional[int]:
                if count_col_idx is not None and count_col_idx < len(r) and r[count_col_idx]:
                    m = re.search(r"([0-9]+)", str(r[count_col_idx]))
                    if m:
                        try:
                            return int(m.group(1))
                        except ValueError:
                            pass
                for c in reversed(r):
                    if c:
                        m = re.search(r"\b([0-9]+)\b", str(c))
                        if m:
                            try:
                                return int(m.group(1))
                            except ValueError:
                                pass
                return None

            # 1. Administrative Area (sqm) - AICTE Certificate 2 / Clause 6.17
            if "administrative_area_sqm" not in seen_keys and any(k in row_lower for k in ("admin", "administrative", "office area")):
                val = get_area_value(row)
                if val and val > 0:
                    seen_keys.add("administrative_area_sqm")
                    fields.append({
                        "field_key": "administrative_area_sqm",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": table_method,
                        "confidence": None,
                        "confidence_basis": table_basis,
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

            # 2. Amenities Area (sqm) - AICTE Certificate 2 / Clause 6.17
            if "amenities_area_sqm" not in seen_keys and any(k in row_lower for k in ("amenit", "amenities", "cafeteria", "common room")):
                val = get_area_value(row)
                if val and val > 0:
                    seen_keys.add("amenities_area_sqm")
                    fields.append({
                        "field_key": "amenities_area_sqm",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": table_method,
                        "confidence": None,
                        "confidence_basis": table_basis,
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

            # 3. Instructional Area (sqm)
            if "instructional_area_sqm" not in seen_keys and any(k in row_lower for k in ("instructional", "academic area")):
                val = get_area_value(row)
                if val and val > 0:
                    seen_keys.add("instructional_area_sqm")
                    fields.append({
                        "field_key": "instructional_area_sqm",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": table_method,
                        "confidence": None,
                        "confidence_basis": table_basis,
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

            # 4. Classroom Carpet Area (sqm)
            if "classroom_carpet_area_sqm" not in seen_keys and any(k in row_lower for k in ("classroom", "class room", "lecture hall", "tutorial room")):
                val = get_area_value(row)
                if val and val > 0:
                    seen_keys.add("classroom_carpet_area_sqm")
                    fields.append({
                        "field_key": "classroom_carpet_area_sqm",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": table_method,
                        "confidence": None,
                        "confidence_basis": table_basis,
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

            # 5. Land Area
            if "land_area_acres" not in seen_keys and any(k in row_lower for k in ("land area", "total land", "plot area")):
                val = get_area_value(row)
                if val and val > 0:
                    seen_keys.add("land_area_acres")
                    fields.append({
                        "field_key": "land_area_acres",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": table_method,
                        "confidence": None,
                        "confidence_basis": table_basis,
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

            # 6. Faculty Cadre: Professor
            if "professor_count" not in seen_keys and "professor" in row_lower and "associate" not in row_lower and "assistant" not in row_lower:
                val = get_count_value(row)
                if val is not None and val >= 0:
                    seen_keys.add("professor_count")
                    fields.append({
                        "field_key": "professor_count",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": table_method,
                        "confidence": None,
                        "confidence_basis": table_basis,
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

            # 7. Faculty Cadre: Associate Professor
            if "associate_professor_count" not in seen_keys and "associate professor" in row_lower:
                val = get_count_value(row)
                if val is not None and val >= 0:
                    seen_keys.add("associate_professor_count")
                    fields.append({
                        "field_key": "associate_professor_count",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": table_method,
                        "confidence": None,
                        "confidence_basis": table_basis,
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

            # 8. Faculty Cadre: Assistant Professor
            if "assistant_professor_count" not in seen_keys and "assistant professor" in row_lower:
                val = get_count_value(row)
                if val is not None and val >= 0:
                    seen_keys.add("assistant_professor_count")
                    fields.append({
                        "field_key": "assistant_professor_count",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": table_method,
                        "confidence": None,
                        "confidence_basis": table_basis,
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

            # 9. Total Faculty Count
            if "total_faculty_count" not in seen_keys and any(k in row_lower for k in ("total faculty", "total teaching staff", "faculty total")):
                val = get_count_value(row)
                if val is not None and val >= 0:
                    seen_keys.add("total_faculty_count")
                    fields.append({
                        "field_key": "total_faculty_count",
                        "raw_value": str(val),
                        "normalized_value": str(val),
                        "normalization_status": "OK",
                        "date_parse_status": None,
                        "page_number": page_number,
                        "extraction_method": "TABLE_PYMUPDF",
                        "confidence": None,
                        "confidence_basis": "DIGITAL_TABLE",
                        "extraction_status": "EXTRACTED",
                        "candidate_values": {
                            "bounding_box": bbox,
                            "evidence_snippet": f"Table Row: {row_str}",
                            "table_index": tab_idx,
                            "row_index": row_idx,
                        },
                    })

    return fields


def extract_document_text(
    document_id: str,
    db: Session,
    processing_run_id: Optional[str] = None,
) -> Optional[ProcessingRun]:
    """Extract page-level text from a stored document (PDF or image).
    Follows AI_PIPELINE.md Sections 7, 8, 12 and DATA_MODEL_AND_API.md Section 6.7.
    - Uses PyMuPDF for native digital PDF text.
    - Falls back to RapidOCR for scanned/empty PDF pages and image uploads.
    - Never fabricates confidence scores; digital text reports null confidence.
    - Updates document processing_status and extraction_quality_band.
    """
    start_total_time = time.time()

    # 1. Fetch document
    doc = db.scalar(
        select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
    )
    if not doc:
        return None

    # 2. Resolve or create ProcessingRun
    run: Optional[ProcessingRun] = None
    if processing_run_id:
        run = db.scalar(select(ProcessingRun).where(ProcessingRun.id == processing_run_id))

    if not run:
        # Check for existing QUEUED run
        run = db.scalar(
            select(ProcessingRun)
            .where(ProcessingRun.document_id == document_id, ProcessingRun.status == "QUEUED")
            .order_by(ProcessingRun.started_at.desc())
        )

    if not run:
        run = ProcessingRun(
            document_id=document_id,
            trigger="REPROCESS",
            status="PROCESSING",
            pipeline_version="0.1.0",
            requested_by=doc.uploaded_by,
        )
        db.add(run)
        db.flush()
    else:
        run.status = "PROCESSING"

    doc.processing_status = "PROCESSING"
    db.commit()

    # 3. Resolve storage path
    file_path = resolve_storage_path(doc.storage_key)
    if not file_path.exists():
        doc.file_state = "MISSING"
        doc.processing_status = "FAILED"
        run.status = "FAILED"
        run.error_code = "FILE_MISSING"
        run.safe_error_summary = "Document file was not found in private storage."
        run.completed_at = datetime.now(timezone.utc)
        run.duration_ms = int((time.time() - start_total_time) * 1000)

        record_audit_event(
            db=db,
            event_type="DOCUMENT_PROCESSING_FAILED",
            entity_type="DOCUMENT",
            entity_id=doc.id,
            document_id=doc.id,
            application_id=doc.application_id,
            actor_id=run.requested_by,
            metadata={"run_id": run.id, "error_code": "FILE_MISSING"},
        )
        db.commit()
        return run

    # 4. Clean up any existing pages for this run (idempotency)
    db.execute(delete(DocumentPage).where(DocumentPage.processing_run_id == run.id))
    db.flush()

    pages: List[DocumentPage] = []
    warnings: List[str] = []
    page_details: Dict[str, Any] = {}
    total_pages_detected = 1
    total_tables_detected = 0

    try:
        # 5. Process PDF
        if doc.media_type == "application/pdf":
            try:
                pdf_doc = pymupdf.open(str(file_path))
            except Exception as e:
                doc.processing_status = "FAILED"
                run.status = "FAILED"
                run.error_code = "FILE_CORRUPTED"
                run.safe_error_summary = "PDF file appears malformed or corrupted."
                run.completed_at = datetime.now(timezone.utc)
                run.duration_ms = int((time.time() - start_total_time) * 1000)
                db.commit()
                return run

            if pdf_doc.is_encrypted:
                pdf_doc.close()
                doc.processing_status = "FAILED"
                run.status = "FAILED"
                run.error_code = "FILE_ENCRYPTED"
                run.safe_error_summary = "Password-protected or encrypted PDF cannot be extracted."
                run.completed_at = datetime.now(timezone.utc)
                run.duration_ms = int((time.time() - start_total_time) * 1000)
                db.commit()
                return run

            total_pages_detected = len(pdf_doc)
            doc.page_count = total_pages_detected

            pages_to_process = min(total_pages_detected, MAX_PAGES)
            if total_pages_detected > MAX_PAGES:
                warnings.append(f"PAGE_CAP_EXCEEDED_{total_pages_detected}_PAGES")

            for page_idx in range(pages_to_process):
                page_start = time.time()
                page_num = page_idx + 1
                page = pdf_doc[page_idx]

                # Check for vector tables on digital pages
                tables_on_page = []
                try:
                    tables_on_page = extract_tables_from_page(page)
                    total_tables_detected += len(tables_on_page)
                except Exception:
                    pass

                # Direct text extraction
                extracted_text = page.get_text("text") or ""
                stripped_text = extracted_text.strip()

                if len(stripped_text) >= MIN_TEXT_CHARS:
                    # Native digital text
                    clean_text = clean_extracted_text(extracted_text)
                    page_duration = int((time.time() - page_start) * 1000)
                    page_obj = DocumentPage(
                        document_id=doc.id,
                        processing_run_id=run.id,
                        page_number=page_num,
                        text_source="DIGITAL_TEXT",
                        raw_text=extracted_text,
                        clean_text=clean_text,
                        char_count=len(clean_text or ""),
                        ocr_mean_confidence=None,  # Strictly null for digital text
                        rotation_applied=0,
                        status="SUCCEEDED",
                        duration_ms=page_duration,
                    )
                    pages.append(page_obj)
                    db.add(page_obj)
                    page_details[str(page_num)] = {
                        "page_number": page_num,
                        "width": round(float(page.rect.width), 2),
                        "height": round(float(page.rect.height), 2),
                        "text_source": "DIGITAL_TEXT",
                        "tables": tables_on_page,
                    }
                else:
                    # OCR fallback for scanned/empty page
                    try:
                        page_area_pt = float(page.rect.width * page.rect.height) if hasattr(page, "rect") else 500_000.0
                        render_dpi = 300 if page_area_pt < 450_000 else 200
                        pix = page.get_pixmap(dpi=render_dpi)
                        img_bytes = pix.tobytes("png")
                        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                        img_np = np.array(img)

                        # Modular image preprocessing: deskew, orientation, contrast enhancement
                        img_proc, prep_telemetry = preprocess_scanned_image(img_np)
                        page_rot = int(prep_telemetry.get("orientation_applied", 0) + round(prep_telemetry.get("skew_angle", 0.0)))

                        ocr_engine = get_ocr_engine()
                        ocr_result, _ = ocr_engine(img_proc)

                        if ocr_result:
                            ocr_lines = []
                            lines = []
                            scores = []
                            for idx, item in enumerate(ocr_result):
                                if len(item) > 1 and item[1]:
                                    line_str = item[1].strip()
                                    line_conf = float(item[2]) if len(item) > 2 and item[2] is not None else 1.0
                                    poly = (
                                        [[round(float(coord[0]), 2), round(float(coord[1]), 2)] for coord in item[0]]
                                        if len(item) > 0 and isinstance(item[0], list)
                                        else []
                                    )
                                    line_bbox = (
                                        {
                                            "x0": round(min(p[0] for p in poly), 2),
                                            "y0": round(min(p[1] for p in poly), 2),
                                            "x1": round(max(p[0] for p in poly), 2),
                                            "y1": round(max(p[1] for p in poly), 2),
                                        }
                                        if poly
                                        else None
                                    )
                                    lines.append(line_str)
                                    scores.append(line_conf)
                                    ocr_lines.append({
                                        "line_index": idx,
                                        "text": line_str,
                                        "confidence": round(line_conf, 4),
                                        "bounding_box": line_bbox,
                                        "polygon": poly,
                                    })

                            raw_ocr = "\n".join(lines)
                            clean_ocr = clean_extracted_text(raw_ocr)
                            mean_conf = (
                                round(float(sum(scores) / len(scores)), 4) if scores else None
                            )

                            # Scanned table extraction on raster image
                            raster_tables = extract_tables_from_raster(img_proc, ocr_lines)
                            total_tables_detected += len(raster_tables)

                            # Detect visual stamps and signatures
                            visual_artifacts = detect_visual_stamps_and_signatures(img_proc)

                            page_details[str(page_num)] = {
                                "page_number": page_num,
                                "width": float(img_proc.shape[1]),
                                "height": float(img_proc.shape[0]),
                                "dpi": render_dpi,
                                "text_source": "OCR",
                                "ocr_lines": ocr_lines,
                                "preprocessing": prep_telemetry,
                                "tables": raster_tables,
                                "visual_artifacts": visual_artifacts,
                            }

                            page_duration = int((time.time() - page_start) * 1000)
                            page_obj = DocumentPage(
                                document_id=doc.id,
                                processing_run_id=run.id,
                                page_number=page_num,
                                text_source="OCR",
                                raw_text=raw_ocr,
                                clean_text=clean_ocr,
                                char_count=len(clean_ocr or ""),
                                ocr_mean_confidence=mean_conf,
                                rotation_applied=page_rot,
                                status="SUCCEEDED",
                                duration_ms=page_duration,
                            )
                            pages.append(page_obj)
                            db.add(page_obj)
                        else:
                            page_duration = int((time.time() - page_start) * 1000)
                            page_obj = DocumentPage(
                                document_id=doc.id,
                                processing_run_id=run.id,
                                page_number=page_num,
                                text_source="NONE",
                                raw_text=None,
                                clean_text=None,
                                char_count=0,
                                ocr_mean_confidence=None,
                                rotation_applied=0,
                                status="SUCCEEDED_WITH_WARNINGS",
                                duration_ms=page_duration,
                            )
                            pages.append(page_obj)
                            db.add(page_obj)
                    except Exception as ocr_err:
                        page_duration = int((time.time() - page_start) * 1000)
                        page_obj = DocumentPage(
                            document_id=doc.id,
                            processing_run_id=run.id,
                            page_number=page_num,
                            text_source="NONE",
                            raw_text=None,
                            clean_text=None,
                            char_count=0,
                            ocr_mean_confidence=None,
                            rotation_applied=0,
                            status="FAILED",
                            error_code="OCR_EXECUTION_ERROR",
                            duration_ms=page_duration,
                        )
                        pages.append(page_obj)
                        db.add(page_obj)

            pdf_doc.close()

        # 6. Process Image (PNG, JPEG)
        elif doc.media_type in ("image/png", "image/jpeg"):
            total_pages_detected = 1
            doc.page_count = 1
            page_start = time.time()

            try:
                img = Image.open(str(file_path))
                # Protect memory against decompression bombs / excessive resolution
                if img.width * img.height > MAX_PIXELS:
                    scale = (MAX_PIXELS / (img.width * img.height)) ** 0.5
                    new_size = (int(img.width * scale), int(img.height * scale))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                    warnings.append("IMAGE_DOWNSCALED_FOR_MEMORY")

                img_rgb = img.convert("RGB")
                img_np = np.array(img_rgb)

                # Modular image preprocessing: deskew, orientation, contrast enhancement
                img_proc, prep_telemetry = preprocess_scanned_image(img_np)
                page_rot = int(prep_telemetry.get("orientation_applied", 0) + round(prep_telemetry.get("skew_angle", 0.0)))

                ocr_engine = get_ocr_engine()
                ocr_result, _ = ocr_engine(img_proc)

                if ocr_result:
                    ocr_lines = []
                    lines = []
                    scores = []
                    for idx, item in enumerate(ocr_result):
                        if len(item) > 1 and item[1]:
                            line_str = item[1].strip()
                            line_conf = float(item[2]) if len(item) > 2 and item[2] is not None else 1.0
                            poly = (
                                [[round(float(coord[0]), 2), round(float(coord[1]), 2)] for coord in item[0]]
                                if len(item) > 0 and isinstance(item[0], list)
                                else []
                            )
                            line_bbox = (
                                {
                                    "x0": round(min(p[0] for p in poly), 2),
                                    "y0": round(min(p[1] for p in poly), 2),
                                    "x1": round(max(p[0] for p in poly), 2),
                                    "y1": round(max(p[1] for p in poly), 2),
                                }
                                if poly
                                else None
                            )
                            lines.append(line_str)
                            scores.append(line_conf)
                            ocr_lines.append({
                                "line_index": idx,
                                "text": line_str,
                                "confidence": round(line_conf, 4),
                                "bounding_box": line_bbox,
                                "polygon": poly,
                            })

                    raw_ocr = "\n".join(lines)
                    clean_ocr = clean_extracted_text(raw_ocr)
                    mean_conf = (
                        round(float(sum(scores) / len(scores)), 4) if scores else None
                    )

                    # Scanned table extraction on raster image
                    raster_tables = extract_tables_from_raster(img_proc, ocr_lines)
                    total_tables_detected += len(raster_tables)

                    # Detect visual stamps and signatures
                    visual_artifacts = detect_visual_stamps_and_signatures(img_proc)

                    page_details["1"] = {
                        "page_number": 1,
                        "width": float(img_proc.shape[1]),
                        "height": float(img_proc.shape[0]),
                        "text_source": "OCR",
                        "ocr_lines": ocr_lines,
                        "preprocessing": prep_telemetry,
                        "tables": raster_tables,
                        "visual_artifacts": visual_artifacts,
                    }

                    page_duration = int((time.time() - page_start) * 1000)
                    page_obj = DocumentPage(
                        document_id=doc.id,
                        processing_run_id=run.id,
                        page_number=1,
                        text_source="OCR",
                        raw_text=raw_ocr,
                        clean_text=clean_ocr,
                        char_count=len(clean_ocr or ""),
                        ocr_mean_confidence=mean_conf,
                        rotation_applied=page_rot,
                        status="SUCCEEDED",
                        duration_ms=page_duration,
                    )
                    pages.append(page_obj)
                    db.add(page_obj)
                else:
                    page_duration = int((time.time() - page_start) * 1000)
                    page_obj = DocumentPage(
                        document_id=doc.id,
                        processing_run_id=run.id,
                        page_number=1,
                        text_source="NONE",
                        raw_text=None,
                        clean_text=None,
                        char_count=0,
                        ocr_mean_confidence=None,
                        rotation_applied=0,
                        status="SUCCEEDED_WITH_WARNINGS",
                        duration_ms=page_duration,
                    )
                    pages.append(page_obj)
                    db.add(page_obj)

            except Exception as img_err:
                page_duration = int((time.time() - page_start) * 1000)
                page_obj = DocumentPage(
                    document_id=doc.id,
                    processing_run_id=run.id,
                    page_number=1,
                    text_source="NONE",
                    raw_text=None,
                    clean_text=None,
                    char_count=0,
                    ocr_mean_confidence=None,
                    rotation_applied=0,
                    status="FAILED",
                    error_code="IMAGE_DECODE_ERROR",
                    duration_ms=page_duration,
                )
                pages.append(page_obj)
                db.add(page_obj)
        else:
            doc.processing_status = "FAILED"
            run.status = "FAILED"
            run.error_code = "UNSUPPORTED_MEDIA_TYPE"
            run.safe_error_summary = f"Media type {doc.media_type} is not supported for extraction."
            run.completed_at = datetime.now(timezone.utc)
            run.duration_ms = int((time.time() - start_total_time) * 1000)
            db.commit()
            return run

    except Exception as general_err:
        doc.processing_status = "FAILED"
        run.status = "FAILED"
        run.error_code = "EXTRACTION_PIPELINE_ERROR"
        run.safe_error_summary = "An unexpected error occurred during extraction."
        run.completed_at = datetime.now(timezone.utc)
        run.duration_ms = int((time.time() - start_total_time) * 1000)
        db.commit()
        return run

    # 7. Quality metrics and summary derivation
    pages_total = len(pages)
    pages_processed = sum(
        1 for p in pages if p.status in ("SUCCEEDED", "SUCCEEDED_WITH_WARNINGS")
    )
    pages_failed = sum(1 for p in pages if p.status == "FAILED")

    text_source_mix = {
        "DIGITAL_TEXT": sum(1 for p in pages if p.text_source == "DIGITAL_TEXT"),
        "OCR": sum(1 for p in pages if p.text_source == "OCR"),
        "NONE": sum(1 for p in pages if p.text_source == "NONE"),
    }

    ocr_confidences = [
        p.ocr_mean_confidence for p in pages if p.ocr_mean_confidence is not None
    ]
    overall_ocr_mean = (
        round(float(sum(ocr_confidences) / len(ocr_confidences)), 4)
        if ocr_confidences
        else None
    )

    total_characters = sum(p.char_count for p in pages)

    # Derive extraction_quality_band and overall status
    if total_characters == 0 or pages_processed == 0:
        quality_band = "UNUSABLE"
        run_status = "MANUAL_REVIEW_REQUIRED"
        doc_status = "MANUAL_REVIEW_REQUIRED"
        run.error_code = "NO_TEXT_EXTRACTED"
        run.safe_error_summary = "No readable text could be extracted from this document."
    elif pages_failed > 0:
        quality_band = "POOR"
        run_status = "PARTIAL"
        doc_status = "PARTIAL"
        warnings.append(f"{pages_failed}_PAGES_FAILED")
    else:
        if overall_ocr_mean is not None and overall_ocr_mean < 0.60:
            quality_band = "POOR"
            run_status = "COMPLETED_WITH_WARNINGS"
            doc_status = "COMPLETED_WITH_WARNINGS"
            warnings.append("OCR_CONFIDENCE_POOR")
        elif text_source_mix["OCR"] > 0:
            quality_band = "FAIR" if (overall_ocr_mean and overall_ocr_mean < 0.80) else "GOOD"
            run_status = "COMPLETED"
            doc_status = "COMPLETED"
        else:
            quality_band = "GOOD"
            run_status = "COMPLETED"
            doc_status = "COMPLETED"

    total_duration_ms = int((time.time() - start_total_time) * 1000)

    quality_summary: Dict[str, Any] = {
        "pages_total": pages_total,
        "pages_processed": pages_processed,
        "pages_failed": pages_failed,
        "text_source_mix": text_source_mix,
        "ocr_mean_confidence": overall_ocr_mean,
        "extraction_quality_band": quality_band,
        "total_characters": total_characters,
        "tables_detected": total_tables_detected,
        "page_details": page_details,
    }

    run.status = run_status
    run.warnings = warnings if warnings else None
    run.quality_summary = quality_summary
    run.completed_at = datetime.now(timezone.utc)
    run.duration_ms = total_duration_ms

    doc.processing_status = doc_status
    doc.extraction_quality_band = quality_band

    # Audit event
    record_audit_event(
        db=db,
        event_type="DOCUMENT_PROCESSED",
        entity_type="DOCUMENT",
        entity_id=doc.id,
        document_id=doc.id,
        application_id=doc.application_id,
        actor_id=run.requested_by,
        metadata={
            "run_id": run.id,
            "status": run.status,
            "quality_band": quality_band,
            "pages_total": pages_total,
            "text_source_mix": text_source_mix,
            "ocr_mean_confidence": overall_ocr_mean,
            "duration_ms": total_duration_ms,
        },
    )

    db.commit()
    db.refresh(run)
    db.refresh(doc)
    return run


def run_background_extraction(document_id: str, run_id: str) -> None:
    """Safe entry point for background task execution via FastAPI BackgroundTasks."""
    db = SessionLocal()
    try:
        extract_document_text(document_id=document_id, db=db, processing_run_id=run_id)
    except Exception:
        try:
            run = db.scalar(select(ProcessingRun).where(ProcessingRun.id == run_id))
            doc = db.scalar(select(Document).where(Document.id == document_id))
            if run:
                run.status = "FAILED"
                run.error_code = "BACKGROUND_WORKER_ERROR"
                run.safe_error_summary = "An unexpected error occurred in background processing."
                run.completed_at = datetime.now(timezone.utc)
            if doc:
                doc.processing_status = "FAILED"
            db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
