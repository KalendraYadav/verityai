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


class ChecklistItemResponse(BaseModel):
    document_code: str
    title: str
    status: str  # REQUIRED_MISSING, REQUIRED_UPLOADED, CONDITIONAL_NEEDS_REVIEW, NOT_APPLICABLE, PENDING_VERIFICATION, NEEDS_HUMAN_REVIEW
    mandatory_or_conditional: str  # MANDATORY, CONDITIONAL
    condition_rationale: str
    activating_condition: Optional[str] = None
    source_clause: str
    pdf_page: int
    is_present: bool = False
    uploaded_document_id: Optional[str] = None
    uploaded_document_name: Optional[str] = None
    human_review_required: bool = False


class ApplicationChecklistResponse(BaseModel):
    application_id: str
    category_code: str
    category_name: str
    total_required: int
    total_present: int
    total_conditional: int
    total_not_applicable: int
    items: List[ChecklistItemResponse] = Field(default_factory=list)


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
    checklist: Optional[ApplicationChecklistResponse] = None


class WorkflowTransitionRequest(BaseModel):
    target_status: str = Field(..., description="Target lifecycle state: SUBMITTED, UNDER_SCRUTINY, ACTION_REQUIRED, SCRUTINY_COMPLETED")
    reason: Optional[str] = Field(None, description="Reason for status transition")
    reviewer_notes: Optional[str] = Field(None, description="Official reviewer notes or decision text")


class ScrutinyQueueItem(BaseModel):
    id: str
    application_reference: str
    institution_id: str
    institution_name: str
    institution_identifier: Optional[str] = None
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
