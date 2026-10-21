import os
import uuid
import re
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Form, File, UploadFile, status, Response, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.application import Application
from app.models.document import Document
from app.models.processing_run import ProcessingRun
from app.models.document_page import DocumentPage
from app.models.user import User
from app.schemas.common import DataResponse, PaginatedResponse, MetaPagination
from app.schemas.document import (
    DocumentUploadResponseData,
    DocumentResponseData,
    DocumentListItem,
    DocumentClassification,
    DocumentPageItem,
    DocumentPagesResponseData,
    DocumentProcessingStatusData,
    ProcessingRunResponseData,
    ReprocessRequest,
)
from app.core.exceptions import (
    NotFoundException,
    VerityAPIException,
    ConflictException,
)
from app.services.audit import record_audit_event
from app.services.storage import (
    process_and_store_upload,
    resolve_storage_path,
    remove_document_file,
)
from app.services.extraction import run_background_extraction

router = APIRouter()


def _sanitize_header_filename(filename: str) -> str:
    """Sanitize filename for safe Content-Disposition header."""
    clean = re.sub(r'[\r\n"\\/]', '_', filename)
    return clean or "document"


def _resolve_user_id(db: Session, institution_id: Optional[str] = None) -> str:
    """Resolve demo user ID for uploaded_by."""
    if institution_id:
        user = db.scalar(select(User).where(User.institution_id == institution_id))
        if user:
            return user.id
    first_user = db.scalar(select(User))
    if first_user:
        return first_user.id
    return "USR-DEMO-01"


# --- Application-scoped document endpoints ---

@router.post(
    "/applications/{application_id}/documents",
    response_model=DataResponse[DocumentUploadResponseData],
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_document(
    application_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    declared_type: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Secure document upload for an application.
    Validates size, extension, and content magic bytes.
    Computes SHA-256 and detects potential duplicates.
    """
    # 1. Verify application exists
    app_obj = db.scalar(select(Application).where(Application.id == application_id))
    if not app_obj:
        raise NotFoundException("APPLICATION_NOT_FOUND", f"Application '{application_id}' not found.")

    # 2. Check application lifecycle (must allow uploads)
    if app_obj.lifecycle_status in ("ARCHIVED", "CANCELLED"):
        raise ConflictException("APPLICATION_LOCKED", f"Application is {app_obj.lifecycle_status} and cannot accept documents.")

    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    original_filename = file.filename or "unknown"
    declared_mime = file.content_type

    # 3. Stream, validate, hash, and store
    storage_key = None
    try:
        storage_key, detected_media_type, file_size_bytes, sha256_hex = await process_and_store_upload(
            file=file,
            application_id=application_id,
            document_id=doc_id,
            declared_media_type=declared_mime,
        )
    except VerityAPIException as exc:
        # Audit rejected upload
        record_audit_event(
            db=db,
            event_type="FILE_REJECTED",
            entity_type="DOCUMENT",
            entity_id=doc_id,
            document_id=doc_id,
            application_id=application_id,
            actor_id=_resolve_user_id(db, app_obj.institution_id),
            metadata={
                "reason_code": exc.detail.get("code") if isinstance(exc.detail, dict) else "REJECTED",
                "filename": _sanitize_header_filename(original_filename),
                "declared_mime": declared_mime,
            },
        )
        db.commit()
        raise exc

    # 4. Check for duplicate SHA-256
    duplicate_doc = db.scalar(
        select(Document).where(Document.sha256 == sha256_hex, Document.deleted_at.is_(None))
    )
    is_duplicate = duplicate_doc is not None

    user_id = _resolve_user_id(db, app_obj.institution_id)

    # 5. Persist Document and initial ProcessingRun
    try:
        doc_record = Document(
            id=doc_id,
            application_id=application_id,
            original_filename=original_filename,
            storage_key=storage_key,
            storage_backend="LOCAL",
            file_state="PRESENT",
            media_type=detected_media_type,
            declared_media_type=declared_mime,
            file_size_bytes=file_size_bytes,
            sha256=sha256_hex,
            declared_type=declared_type,
            upload_status="ACCEPTED",
            processing_status="QUEUED",
            uploaded_by=user_id,
        )
        db.add(doc_record)

        run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
        initial_run = ProcessingRun(
            id=run_id,
            document_id=doc_id,
            trigger="UPLOAD",
            status="QUEUED",
            pipeline_version="0.1.0",
            requested_by=user_id,
        )
        db.add(initial_run)

        # Audit upload event
        record_audit_event(
            db=db,
            event_type="DOCUMENT_UPLOADED",
            entity_type="DOCUMENT",
            entity_id=doc_id,
            document_id=doc_id,
            application_id=application_id,
            actor_id=user_id,
            metadata={
                "filename": _sanitize_header_filename(original_filename),
                "media_type": detected_media_type,
                "file_size_bytes": file_size_bytes,
                "sha256": sha256_hex,
                "possible_duplicate": is_duplicate,
            },
        )

        db.commit()
        db.refresh(doc_record)

        # Enqueue background text extraction & OCR pipeline
        background_tasks.add_task(run_background_extraction, doc_record.id, initial_run.id)

    except Exception as e:
        db.rollback()
        # Clean up stored file if database commit fails
        if storage_key:
            remove_document_file(storage_key)
        raise e

    return DataResponse(
        data=DocumentUploadResponseData(
            id=doc_record.id,
            application_id=doc_record.application_id,
            original_filename=doc_record.original_filename,
            media_type=doc_record.media_type,
            file_size_bytes=doc_record.file_size_bytes,
            sha256=doc_record.sha256,
            upload_status=doc_record.upload_status,
            processing_status=doc_record.processing_status,
            possible_duplicate=is_duplicate,
            processing_url=f"/api/v1/documents/{doc_record.id}/processing",
            created_at=doc_record.created_at,
        )
    )


@router.get(
    "/applications/{application_id}/documents",
    response_model=PaginatedResponse[DocumentListItem],
)
def list_application_documents(
    application_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List documents belonging to an application."""
    app_obj = db.scalar(select(Application).where(Application.id == application_id))
    if not app_obj:
        raise NotFoundException("APPLICATION_NOT_FOUND", f"Application '{application_id}' not found.")

    query = select(Document).where(
        Document.application_id == application_id,
        Document.deleted_at.is_(None),
    )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = (
        db.scalars(
            query.order_by(desc(Document.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )

    data = [
        DocumentListItem(
            id=doc.id,
            application_id=doc.application_id,
            original_filename=doc.original_filename,
            media_type=doc.media_type,
            file_size_bytes=doc.file_size_bytes,
            sha256=doc.sha256,
            page_count=doc.page_count,
            file_state=doc.file_state,
            upload_status=doc.upload_status,
            processing_status=doc.processing_status,
            extraction_quality_band=doc.extraction_quality_band,
            declared_type=doc.declared_type,
            detected_type=doc.detected_type,
            effective_type=doc.effective_type,
            latest_verification_status=doc.latest_verification_status,
            possible_duplicate=False,
            uploaded_by=doc.uploaded_by,
            created_at=doc.created_at,
        )
        for doc in items
    ]

    return PaginatedResponse(
        data=data,
        meta=MetaPagination(page=page, page_size=page_size, total=total),
    )


# --- Global document endpoints ---

@router.get(
    "/documents",
    response_model=PaginatedResponse[DocumentListItem],
)
def list_all_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    application_id: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List documents with optional filtering by application or search query."""
    query = select(Document).where(Document.deleted_at.is_(None))

    if application_id:
        query = query.where(Document.application_id == application_id)
    if q:
        query = query.where(Document.original_filename.ilike(f"%{q}%"))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = (
        db.scalars(
            query.order_by(desc(Document.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )

    data = [
        DocumentListItem(
            id=doc.id,
            application_id=doc.application_id,
            original_filename=doc.original_filename,
            media_type=doc.media_type,
            file_size_bytes=doc.file_size_bytes,
            sha256=doc.sha256,
            page_count=doc.page_count,
            file_state=doc.file_state,
            upload_status=doc.upload_status,
            processing_status=doc.processing_status,
            extraction_quality_band=doc.extraction_quality_band,
            declared_type=doc.declared_type,
            detected_type=doc.detected_type,
            effective_type=doc.effective_type,
            latest_verification_status=doc.latest_verification_status,
            possible_duplicate=False,
            uploaded_by=doc.uploaded_by,
            created_at=doc.created_at,
        )
        for doc in items
    ]

    return PaginatedResponse(
        data=data,
        meta=MetaPagination(page=page, page_size=page_size, total=total),
    )


@router.get(
    "/documents/{document_id}",
    response_model=DataResponse[DocumentResponseData],
)
def get_document_metadata(
    document_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve metadata for a specific document without exposing filesystem paths."""
    doc = db.scalar(
        select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
    )
    if not doc:
        raise NotFoundException("DOCUMENT_NOT_FOUND", f"Document '{document_id}' not found.")

    # Check if duplicate exists
    dup_count = db.scalar(
        select(func.count()).where(
            Document.sha256 == doc.sha256,
            Document.id != doc.id,
            Document.deleted_at.is_(None),
        )
    )
    is_duplicate = (dup_count or 0) > 0

    classification = None
    if any([doc.declared_type, doc.detected_type, doc.effective_type]):
        classification = DocumentClassification(
            declared_type=doc.declared_type,
            detected_type=doc.detected_type,
            detection_score=doc.detection_score,
            classification_status=doc.classification_status,
            effective_type=doc.effective_type,
        )

    return DataResponse(
        data=DocumentResponseData(
            id=doc.id,
            application_id=doc.application_id,
            original_filename=doc.original_filename,
            media_type=doc.media_type,
            file_size_bytes=doc.file_size_bytes,
            sha256=doc.sha256,
            page_count=doc.page_count,
            file_state=doc.file_state,
            upload_status=doc.upload_status,
            processing_status=doc.processing_status,
            extraction_quality_band=doc.extraction_quality_band,
            classification=classification,
            latest_verification_status=doc.latest_verification_status,
            possible_duplicate=is_duplicate,
            uploaded_by=doc.uploaded_by,
            created_at=doc.created_at,
        )
    )


@router.get("/documents/{document_id}/file")
def retrieve_document_file(
    document_id: str,
    download: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Secure document retrieval/preview.
    Streams file bytes with nosniff and cache-control headers.
    """
    doc = db.scalar(
        select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
    )
    if not doc:
        raise NotFoundException("DOCUMENT_NOT_FOUND", f"Document '{document_id}' not found.")

    if doc.file_state == "DELETED":
        raise NotFoundException("DOCUMENT_DELETED", "This document has been deleted.")

    file_path = resolve_storage_path(doc.storage_key)
    if not file_path.exists():
        # Record file missing state
        doc.file_state = "MISSING"
        db.commit()
        raise NotFoundException("FILE_NOT_FOUND", "The requested document file is missing from storage.")

    safe_filename = _sanitize_header_filename(doc.original_filename)
    disposition_type = "attachment" if download else "inline"

    # Audit file access
    record_audit_event(
        db=db,
        event_type="DOCUMENT_DOWNLOADED" if download else "DOCUMENT_VIEWED",
        entity_type="DOCUMENT",
        entity_id=doc.id,
        document_id=doc.id,
        application_id=doc.application_id,
        actor_id=_resolve_user_id(db),
        metadata={"filename": safe_filename, "disposition": disposition_type},
    )
    db.commit()

    return FileResponse(
        path=str(file_path),
        media_type=doc.media_type,
        headers={
            "Content-Disposition": f'{disposition_type}; filename="{safe_filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )


@router.get(
    "/documents/{document_id}/pages",
    response_model=DataResponse[DocumentPagesResponseData],
)
def get_document_pages(
    document_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve extracted page-level text, method, and OCR confidence."""
    doc = db.scalar(
        select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
    )
    if not doc:
        raise NotFoundException("DOCUMENT_NOT_FOUND", f"Document '{document_id}' not found.")

    # Find the latest processing run's pages or all pages for this document
    pages = db.scalars(
        select(DocumentPage)
        .where(DocumentPage.document_id == document_id)
        .order_by(DocumentPage.page_number.asc())
    ).all()

    page_items = [
        DocumentPageItem(
            id=p.id,
            document_id=p.document_id,
            processing_run_id=p.processing_run_id,
            page_number=p.page_number,
            text_source=p.text_source,
            raw_text=p.raw_text,
            clean_text=p.clean_text,
            char_count=p.char_count,
            ocr_mean_confidence=p.ocr_mean_confidence,
            rotation_applied=p.rotation_applied,
            status=p.status,
            error_code=p.error_code,
            duration_ms=p.duration_ms,
            created_at=p.created_at,
        )
        for p in pages
    ]

    return DataResponse(
        data=DocumentPagesResponseData(
            document_id=doc.id,
            page_count=doc.page_count or len(page_items),
            pages=page_items,
        )
    )


@router.get(
    "/documents/{document_id}/processing",
    response_model=DataResponse[DocumentProcessingStatusData],
)
def get_document_processing_status(
    document_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve processing status, error information, and run history."""
    doc = db.scalar(
        select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
    )
    if not doc:
        raise NotFoundException("DOCUMENT_NOT_FOUND", f"Document '{document_id}' not found.")

    runs = db.scalars(
        select(ProcessingRun)
        .where(ProcessingRun.document_id == document_id)
        .order_by(ProcessingRun.started_at.desc())
    ).all()

    current_run_item = None
    runs_history = []
    for r in runs:
        item = ProcessingRunResponseData(
            id=r.id,
            document_id=r.document_id,
            trigger=r.trigger,
            status=r.status,
            pipeline_version=r.pipeline_version,
            warnings=r.warnings,
            error_code=r.error_code,
            safe_error_summary=r.safe_error_summary,
            quality_summary=r.quality_summary,
            started_at=r.started_at,
            completed_at=r.completed_at,
            duration_ms=r.duration_ms,
        )
        if current_run_item is None:
            current_run_item = item
        runs_history.append(item)

    return DataResponse(
        data=DocumentProcessingStatusData(
            document_id=doc.id,
            processing_status=doc.processing_status,
            extraction_quality_band=doc.extraction_quality_band,
            current_run=current_run_item,
            runs_history=runs_history,
        )
    )


@router.post(
    "/documents/{document_id}/reprocess",
    response_model=DataResponse[DocumentProcessingStatusData],
    status_code=status.HTTP_202_ACCEPTED,
)
def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    request_data: Optional[ReprocessRequest] = None,
    db: Session = Depends(get_db),
):
    """Trigger re-extraction/reprocessing of an uploaded document.
    Enforces idempotency and prevents concurrent duplicate processing.
    """
    doc = db.scalar(
        select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
    )
    if not doc:
        raise NotFoundException("DOCUMENT_NOT_FOUND", f"Document '{document_id}' not found.")

    if doc.file_state == "DELETED":
        raise NotFoundException("DOCUMENT_DELETED", "Cannot reprocess a deleted document.")

    if doc.processing_status == "PROCESSING":
        raise ConflictException(
            "PROCESSING_ACTIVE", "A processing run is already currently active for this document."
        )

    file_path = resolve_storage_path(doc.storage_key)
    if not file_path.exists():
        doc.file_state = "MISSING"
        db.commit()
        raise NotFoundException("FILE_NOT_FOUND", "Document file is missing from storage.")

    # Create new ProcessingRun
    user_id = _resolve_user_id(db)
    new_run = ProcessingRun(
        id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        document_id=doc.id,
        trigger="REPROCESS",
        status="QUEUED",
        pipeline_version="0.1.0",
        requested_by=user_id,
    )
    doc.processing_status = "QUEUED"
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    db.refresh(doc)

    # Enqueue background extraction
    background_tasks.add_task(run_background_extraction, doc.id, new_run.id)

    run_item = ProcessingRunResponseData(
        id=new_run.id,
        document_id=new_run.document_id,
        trigger=new_run.trigger,
        status=new_run.status,
        pipeline_version=new_run.pipeline_version,
        warnings=new_run.warnings,
        error_code=new_run.error_code,
        safe_error_summary=new_run.safe_error_summary,
        quality_summary=new_run.quality_summary,
        started_at=new_run.started_at,
        completed_at=new_run.completed_at,
        duration_ms=new_run.duration_ms,
    )

    return DataResponse(
        data=DocumentProcessingStatusData(
            document_id=doc.id,
            processing_status=doc.processing_status,
            extraction_quality_band=doc.extraction_quality_band,
            current_run=run_item,
            runs_history=[run_item],
        )
    )

