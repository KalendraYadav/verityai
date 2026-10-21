import io
import re
import time
import unicodedata
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from PIL import Image
import numpy as np
import pymupdf
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.processing_run import ProcessingRun
from app.models.document_page import DocumentPage
from app.services.storage import resolve_storage_path
from app.services.audit import record_audit_event

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
    total_pages_detected = 1

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
                else:
                    # OCR fallback for scanned/empty page
                    try:
                        pix = page.get_pixmap(dpi=200)
                        img_bytes = pix.tobytes("png")
                        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                        img_np = np.array(img)

                        ocr_engine = get_ocr_engine()
                        ocr_result, _ = ocr_engine(img_np)

                        if ocr_result:
                            lines = [item[1] for item in ocr_result if len(item) > 1 and item[1]]
                            scores = [
                                float(item[2])
                                for item in ocr_result
                                if len(item) > 2 and item[2] is not None
                            ]
                            raw_ocr = "\n".join(lines)
                            clean_ocr = clean_extracted_text(raw_ocr)
                            mean_conf = (
                                round(float(sum(scores) / len(scores)), 4) if scores else None
                            )

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
                                rotation_applied=0,
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

                ocr_engine = get_ocr_engine()
                ocr_result, _ = ocr_engine(img_np)

                if ocr_result:
                    lines = [item[1] for item in ocr_result if len(item) > 1 and item[1]]
                    scores = [
                        float(item[2])
                        for item in ocr_result
                        if len(item) > 2 and item[2] is not None
                    ]
                    raw_ocr = "\n".join(lines)
                    clean_ocr = clean_extracted_text(raw_ocr)
                    mean_conf = (
                        round(float(sum(scores) / len(scores)), 4) if scores else None
                    )

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
                        rotation_applied=0,
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
