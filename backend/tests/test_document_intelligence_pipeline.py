import numpy as np
import cv2
import pytest

from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.processing_run import ProcessingRun
from app.services.preprocessing import (
    estimate_skew_angle,
    rotate_image_exact,
    rotate_orthogonal,
    detect_orthogonal_orientation,
    enhance_contrast_clahe,
    preprocess_scanned_image,
)
from app.services.extraction import (
    extract_tables_from_raster,
    detect_visual_stamps_and_signatures,
    find_spatial_neighbor_box,
    extract_structured_fields_from_tables,
)
from app.services.anomaly import extract_fields_from_document_pages


# ---------------------------------------------------------------------------
# 1. Image Preprocessing Tests
# ---------------------------------------------------------------------------

def test_preprocessing_deskew_and_rotation():
    """Verify skew estimation and exact rotation on synthetic tilted text document."""
    # Create white canvas with horizontal black text bar tilted at 5 degrees
    img = np.full((300, 500, 3), 255, dtype=np.uint8)
    cv2.line(img, (50, 150), (450, 150), (0, 0, 0), 8)
    cv2.line(img, (50, 200), (450, 200), (0, 0, 0), 8)

    # Rotate by 5 degrees counter-clockwise
    M = cv2.getRotationMatrix2D((250, 150), 5.0, 1.0)
    tilted = cv2.warpAffine(img, M, (500, 300), borderValue=(255, 255, 255))

    angle = estimate_skew_angle(tilted)
    # Estimated angle should be close to -5 degrees
    assert abs(abs(angle) - 5.0) < 1.0

    corrected = rotate_image_exact(tilted, angle)
    # Bounding box is safely expanded to avoid clipping rotated content
    assert corrected.ndim == 3
    assert corrected.shape[2] == 3
    assert corrected.shape[0] >= tilted.shape[0]
    assert corrected.shape[1] >= tilted.shape[1]
    assert corrected.dtype == np.uint8


def test_preprocessing_clahe_contrast_enhancement():
    """Verify CLAHE contrast enhancement improves dynamic range without modifying shape."""
    low_contrast = np.full((200, 200, 3), 128, dtype=np.uint8)
    # Add slight variation
    low_contrast[50:150, 50:150] = 135

    enhanced = enhance_contrast_clahe(low_contrast)
    assert enhanced.shape == (200, 200, 3)
    assert enhanced.dtype == np.uint8
    # Dynamic range should be wider in enhanced image
    assert int(enhanced.max()) - int(enhanced.min()) >= int(low_contrast.max()) - int(low_contrast.min())


def test_preprocessing_pipeline_safe_fallback():
    """Verify that corrupt or zero-size images fall back safely without crashing."""
    empty_img = np.zeros((0, 0, 3), dtype=np.uint8)
    processed, telemetry = preprocess_scanned_image(empty_img)
    assert telemetry["preprocessing_status"] == "EMPTY_IMAGE"
    assert processed.size == 0

    # Normal white image should proceed with SUCCESS
    normal_img = np.full((100, 100, 3), 255, dtype=np.uint8)
    processed_normal, normal_telem = preprocess_scanned_image(normal_img)
    assert normal_telem["preprocessing_status"] == "SUCCESS"
    assert processed_normal.shape == (100, 100, 3)


# ---------------------------------------------------------------------------
# 2. Scanned Raster Table Extraction Tests
# ---------------------------------------------------------------------------

def test_raster_table_morphological_extraction():
    """Verify extraction of grid cells and association with OCR lines from synthetic raster grid."""
    # Create synthetic 3x3 table grid on 600x600 image
    img = np.full((600, 600, 3), 255, dtype=np.uint8)
    # Outer border and grid lines
    cv2.rectangle(img, (50, 50), (550, 350), (0, 0, 0), 2)
    cv2.line(img, (50, 150), (550, 150), (0, 0, 0), 2)
    cv2.line(img, (50, 250), (550, 250), (0, 0, 0), 2)
    cv2.line(img, (200, 50), (200, 350), (0, 0, 0), 2)
    cv2.line(img, (400, 50), (400, 350), (0, 0, 0), 2)

    # Simulated OCR lines located inside cells
    ocr_lines = [
        {"text": "Room Type", "confidence": 0.95, "bounding_box": {"x0": 60, "y0": 80, "x1": 180, "y1": 120}},
        {"text": "Carpet Area", "confidence": 0.94, "bounding_box": {"x0": 210, "y0": 80, "x1": 350, "y1": 120}},
        {"text": "Classroom", "confidence": 0.96, "bounding_box": {"x0": 60, "y0": 180, "x1": 180, "y1": 220}},
        {"text": "66.50", "confidence": 0.97, "bounding_box": {"x0": 210, "y0": 180, "x1": 300, "y1": 220}},
    ]

    tables = extract_tables_from_raster(img, ocr_lines)
    assert len(tables) >= 1
    t = tables[0]
    assert t["table_source"] == "SCANNED_MORPHOLOGICAL_CV"
    assert t["row_count"] >= 1
    assert t["col_count"] >= 2
    assert "headers" in t
    assert "rows" in t

    # Verify structured field extraction routes raster table
    fields = extract_structured_fields_from_tables(tables, page_number=1)
    assert len(fields) >= 1
    f_map = {f["field_key"]: f for f in fields}
    assert "classroom_carpet_area_sqm" in f_map
    assert f_map["classroom_carpet_area_sqm"]["raw_value"] == "66.5"
    assert f_map["classroom_carpet_area_sqm"]["extraction_method"] == "TABLE_CELL_PARSER"


# ---------------------------------------------------------------------------
# 3. Visual Stamp and Signature Presence Detection Tests
# ---------------------------------------------------------------------------

def test_visual_stamp_and_signature_detection():
    """Verify detection of colored ink stamps and cursive signature strokes with legal disclaimers."""
    # 800x600 canvas
    img = np.full((800, 600, 3), 255, dtype=np.uint8)

    # Draw blue circular stamp in bottom right
    cv2.circle(img, (450, 650), 45, (180, 50, 30), 4)  # BGR: blue dominant
    cv2.putText(img, "OFFICIAL SEAL", (420, 655), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 50, 30), 1)

    # Draw simulated dark signature strokes in authorization zone (bottom 35% of document)
    for i in range(10):
        cv2.line(img, (150 + i * 15, 680 + (i % 3) * 10), (165 + i * 15, 670 - (i % 4) * 8), (40, 40, 40), 2)

    detections = detect_visual_stamps_and_signatures(img)

    # Check legal disclaimers and flags
    assert detections["visual_stamp_detected"] is True
    assert detections["stamp_bounding_box"] is not None
    assert detections["cryptographically_verified"] is False
    assert detections["legal_authenticity_confirmed"] is False
    assert "does not establish legal validity" in detections["disclaimer"].lower()


# ---------------------------------------------------------------------------
# 4. Spatial Proximity Field Extraction Tests
# ---------------------------------------------------------------------------

def test_find_spatial_neighbor_box():
    """Verify horizontal and vertical bounding-box proximity pairing."""
    label_line = {
        "text": "Certificate No:",
        "bounding_box": {"x0": 50, "y0": 100, "x1": 150, "y1": 130},
        "line_index": 0,
    }
    right_line = {
        "text": "VAL-999",
        "confidence": 0.98,
        "bounding_box": {"x0": 170, "y0": 102, "x1": 270, "y1": 128},
        "line_index": 1,
    }
    far_line = {
        "text": "FAR-AWAY",
        "confidence": 0.90,
        "bounding_box": {"x0": 700, "y0": 100, "x1": 800, "y1": 130},
        "line_index": 2,
    }
    down_line = {
        "text": "VAL-DOWN",
        "confidence": 0.95,
        "bounding_box": {"x0": 55, "y0": 145, "x1": 145, "y1": 175},
        "line_index": 3,
    }

    # Test horizontal right neighbor
    neighbor_right = find_spatial_neighbor_box(label_line, [far_line, right_line])
    assert neighbor_right is not None
    assert neighbor_right["text"] == "VAL-999"
    assert neighbor_right["direction"] == "HORIZONTAL"

    # Test vertical underneath neighbor
    neighbor_down = find_spatial_neighbor_box(label_line, [down_line, far_line])
    assert neighbor_down is not None
    assert neighbor_down["text"] == "VAL-DOWN"
    assert neighbor_down["direction"] == "VERTICAL"


def test_spatial_proximity_field_candidate_extraction():
    """Verify that disjoint label and value OCR boxes are linked via SPATIAL_PROXIMITY when inline regex misses."""
    doc = Document(
        id="DOC-SPATIAL-01",
        application_id="APP-001",
        declared_type="ACCREDITATION_CERTIFICATE",
        original_filename="spatial_cert.png",
        storage_key="test/spatial_cert.png",
        media_type="image/png",
        file_size_bytes=2000,
        sha256="fake_sha_spatial",
        upload_status="ACCEPTED",
        processing_status="EXTRACTED",
        page_count=1,
    )
    run = ProcessingRun(
        id="RUN-SPATIAL-01",
        document_id=doc.id,
        trigger="TEST",
        status="COMPLETED",
        pipeline_version="1.0.0",
        quality_summary={
            "page_details": {
                "1": {
                    "width": 800,
                    "height": 1100,
                    "ocr_lines": [
                        {
                            "text": "Certificate No",
                            "confidence": 0.96,
                            "bounding_box": {"x0": 80, "y0": 200, "x1": 200, "y1": 230},
                            "polygon": [[80, 200], [200, 200], [200, 230], [80, 230]],
                        },
                        {
                            "text": "NBA-ENGG-2026-X1",
                            "confidence": 0.95,
                            "bounding_box": {"x0": 240, "y0": 202, "x1": 420, "y1": 228},
                            "polygon": [[240, 202], [420, 202], [420, 228], [240, 228]],
                        },
                        {
                            "text": "Approved Intake",
                            "confidence": 0.97,
                            "bounding_box": {"x0": 80, "y0": 300, "x1": 210, "y1": 330},
                            "polygon": [[80, 300], [210, 300], [210, 330], [80, 330]],
                        },
                        {
                            "text": "360",
                            "confidence": 0.98,
                            "bounding_box": {"x0": 230, "y0": 301, "x1": 280, "y1": 329},
                            "polygon": [[230, 301], [280, 301], [280, 329], [230, 329]],
                        },
                    ],
                }
            }
        },
    )
    page = DocumentPage(
        id="PAGE-SPATIAL-01",
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        # Note: isolated labels where regex delimiter patterns do not chain directly to value
        clean_text="Institutional Header\nCertificate No\nDisjoint Subheading\nApproved Intake\nInstitutional Footer\n",
        text_source="OCR",
        ocr_mean_confidence=0.96,
        char_count=80,
    )
    doc.processing_runs = [run]
    doc.pages = [page]

    candidates = extract_fields_from_document_pages(doc)
    c_map = {c["field_key"]: c for c in candidates}

    assert "certificate_number" in c_map
    cert_cand = c_map["certificate_number"]
    assert cert_cand["raw_value"] == "NBA-ENGG-2026-X1"
    assert cert_cand["extraction_method"] == "SPATIAL_PROXIMITY"
    assert cert_cand["candidate_values"]["bounding_box"] == {"x0": 240, "y0": 202, "x1": 420, "y1": 228}
    assert cert_cand["candidate_values"]["polygon"] is not None
    assert cert_cand["candidate_values"]["page_dimensions"] == {"width": 800, "height": 1100}

    assert "approved_intake" in c_map
    intake_cand = c_map["approved_intake"]
    assert intake_cand["raw_value"] == "360"
    assert intake_cand["normalized_value"] == "360"
    assert intake_cand["extraction_method"] == "SPATIAL_PROXIMITY"
    assert intake_cand["candidate_values"]["bounding_box"] == {"x0": 230, "y0": 301, "x1": 280, "y1": 329}
