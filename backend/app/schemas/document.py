from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class DocumentClassification(BaseModel):
    declared_type: Optional[str] = None
    detected_type: Optional[str] = None
    detection_score: Optional[float] = None
    classification_status: Optional[str] = None
    effective_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponseData(BaseModel):
    id: str
    application_id: str
    original_filename: str
    media_type: str
    file_size_bytes: int
    sha256: str
    upload_status: str
    processing_status: str
    possible_duplicate: bool
    processing_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentResponseData(BaseModel):
    id: str
    application_id: str
    original_filename: str
    media_type: str
    file_size_bytes: int
    sha256: str
    page_count: Optional[int] = None
    file_state: str
    upload_status: str
    processing_status: str
    extraction_quality_band: Optional[str] = None
    classification: Optional[DocumentClassification] = None
    latest_verification_status: Optional[str] = None
    possible_duplicate: bool = False
    uploaded_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListItem(BaseModel):
    id: str
    application_id: str
    original_filename: str
    media_type: str
    file_size_bytes: int
    sha256: str
    page_count: Optional[int] = None
    file_state: str
    upload_status: str
    processing_status: str
    extraction_quality_band: Optional[str] = None
    declared_type: Optional[str] = None
    detected_type: Optional[str] = None
    effective_type: Optional[str] = None
    latest_verification_status: Optional[str] = None
    possible_duplicate: bool = False
    uploaded_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProcessingRunResponseData(BaseModel):
    id: str
    document_id: str
    trigger: str
    status: str
    pipeline_version: str
    warnings: Optional[List[Any]] = None
    error_code: Optional[str] = None
    safe_error_summary: Optional[str] = None
    quality_summary: Optional[Dict[str, Any]] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentPageItem(BaseModel):
    id: str
    document_id: str
    processing_run_id: str
    page_number: int
    text_source: str  # DIGITAL_TEXT, OCR, NONE
    raw_text: Optional[str] = None
    clean_text: Optional[str] = None
    char_count: int = 0
    ocr_mean_confidence: Optional[float] = None
    rotation_applied: Optional[int] = 0
    status: str  # SUCCEEDED, SUCCEEDED_WITH_WARNINGS, FAILED, TIMED_OUT, SKIPPED
    error_code: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentPagesResponseData(BaseModel):
    document_id: str
    page_count: int
    pages: List[DocumentPageItem]

    model_config = ConfigDict(from_attributes=True)


class DocumentProcessingStatusData(BaseModel):
    document_id: str
    processing_status: str
    extraction_quality_band: Optional[str] = None
    current_run: Optional[ProcessingRunResponseData] = None
    runs_history: List[ProcessingRunResponseData] = []

    model_config = ConfigDict(from_attributes=True)


class ReprocessRequest(BaseModel):
    from_stage: Optional[str] = "TEXT_EXTRACT"

