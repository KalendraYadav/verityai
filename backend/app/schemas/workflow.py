from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class StageDetail(BaseModel):
    status: str
    summary: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WorkflowStatusResponse(BaseModel):
    application_id: str
    application_reference: str
    lifecycle_status: str
    pipeline_status: str
    submitted_at: Optional[datetime] = None
    assigned_reviewer_id: Optional[str] = None
    stages: Dict[str, StageDetail]
    last_updated_at: datetime


class DocumentReadiness(BaseModel):
    complete: bool
    uploaded_count: int
    required_count: int
    missing_types: List[str] = Field(default_factory=list)


class ProcessingReadiness(BaseModel):
    complete: bool
    total_documents: int
    processed_count: int
    pending_count: int
    failed_count: int


class ValidationReadiness(BaseModel):
    evaluated: bool
    passed_count: int
    failed_count: int
    needs_review_count: int
    unable_to_evaluate_count: int


class AnomalyReadiness(BaseModel):
    analyzed: bool
    total_findings: int
    open_findings: int
    confirmed_findings: int
    dismissed_findings: int
    resolved_findings: int


class ApplicationReadinessResponse(BaseModel):
    application_id: str
    is_ready_for_scrutiny: bool
    readiness_state: str  # READY_FOR_SCRUTINY, DOCUMENTS_PENDING, EXTRACTION_IN_PROGRESS, VALIDATION_REQUIRED, ACTION_REQUIRED, SCRUTINY_COMPLETED
    document_readiness: DocumentReadiness
    processing_readiness: ProcessingReadiness
    validation_readiness: ValidationReadiness
    anomaly_readiness: AnomalyReadiness
    blockers: List[str] = Field(default_factory=list)
    recommended_action: str


class WorkflowTransitionRequest(BaseModel):
    target_status: str = Field(..., description="Target lifecycle state: SUBMITTED, UNDER_SCRUTINY, ACTION_REQUIRED, SCRUTINY_COMPLETED")
    reason: Optional[str] = Field(None, description="Reason for status transition")
    reviewer_notes: Optional[str] = Field(None, description="Official reviewer notes or decision text")


class ScrutinyQueueItem(BaseModel):
    id: str
    application_reference: str
    institution_id: str
    institution_name: str
    category_code: str
    academic_year: Optional[str] = None
    lifecycle_status: str
    pipeline_status: str
    readiness_state: str
    blockers_count: int
    open_findings_count: int
    validation_failure_count: int
    assigned_reviewer_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
