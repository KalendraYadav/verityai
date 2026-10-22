from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ExtractedFieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    processing_run_id: Optional[str] = None
    field_key: str
    raw_value: Optional[str] = None
    normalized_value: Optional[str] = None
    normalization_status: Optional[str] = None
    date_parse_status: Optional[str] = None
    candidate_values: Optional[Any] = None
    page_number: Optional[int] = None
    extraction_method: str
    confidence: Optional[float] = None
    confidence_basis: Optional[str] = None
    extraction_status: str
    review_status: str
    field_version: int
    is_current: bool
    created_at: datetime


class FindingEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    finding_id: str
    sort_order: int
    evidence_type: str
    label: str
    document_id: Optional[str] = None
    field_id: Optional[str] = None
    page_number: Optional[int] = None
    raw_value: Optional[str] = None
    normalized_value: Optional[str] = None
    snapshot: Dict[str, Any] = Field(default_factory=dict)
    captured_at: datetime


class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    document_id: Optional[str] = None
    validation_run_id: Optional[str] = None
    rule_result_id: Optional[str] = None
    rule_code: str
    rule_version: str
    finding_type: str
    category: str
    indicator_id: Optional[str] = None
    finding_key: str
    result_status: str
    severity: str
    title: str
    explanation: str
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    recommended_action: str
    requires_human_review: bool
    evidence_note: Optional[str] = None
    review_status: str
    review_comment: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    is_current: bool
    detection_method: str
    created_at: datetime
    updated_at: datetime
    evidence_items: List[FindingEvidenceResponse] = Field(default_factory=list)


class FindingReviewRequest(BaseModel):
    review_status: str = Field(..., description="OPEN, UNDER_REVIEW, CONFIRMED, DISMISSED, RESOLVED, AWAITING_EVIDENCE")
    comment: Optional[str] = None
    reviewer_id: Optional[str] = None


class ApplicationAnalysisResponse(BaseModel):
    application_id: str
    total_anomalies: int
    open_findings: int
    confirmed_findings: int
    dismissed_findings: int
    resolved_findings: int
    severity_breakdown: Dict[str, int] = Field(default_factory=dict)
    category_breakdown: Dict[str, int] = Field(default_factory=dict)
    ai_advisory_status: str = "LOCAL_DETERMINISTIC_ACTIVE"
    ai_advisory_message: str = "Deterministic cross-document and anomaly detection active. Optional cloud LLM disabled."
    findings: List[FindingResponse] = Field(default_factory=list)
    extracted_fields: List[ExtractedFieldResponse] = Field(default_factory=list)
