from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class RuleExplanationItem(BaseModel):
    rule_code: str
    name: str
    rule_type: str
    status: str  # PASSED, FAILED, NEEDS_REVIEW, UNABLE_TO_EVALUATE
    purpose: str
    expected: str
    observed: str
    evidence_source: str
    document_name: Optional[str] = None
    page_number: Optional[int] = None
    evaluated_at: Optional[datetime] = None
    limitation_or_uncertainty: Optional[str] = None
    recommendation: Optional[str] = None


class FindingEvidenceSummary(BaseModel):
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    page_number: Optional[int] = None
    field_key: Optional[str] = None
    extracted_value: Optional[str] = None
    declared_value: Optional[str] = None
    source_type: Optional[str] = None
    comparison_note: Optional[str] = None


class AnomalyFindingItem(BaseModel):
    finding_id: str
    finding_code: str
    category: str
    severity: str
    status: str
    title: str
    description: str
    source_agent: str
    confidence_score: Optional[float] = None
    evidence: List[FindingEvidenceSummary] = Field(default_factory=list)
    suggested_action: Optional[str] = None


class ActionRecommendation(BaseModel):
    action_type: str  # MISSING_DOCUMENT, INSPECT_PAGE, RESOLVE_VALIDATION, REVIEW_ANOMALY, RECORD_DECISION
    priority: str  # HIGH, MEDIUM, LOW
    title: str
    description: str
    reference_id: Optional[str] = None


class EvidenceTraceItem(BaseModel):
    id: str
    application_id: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    page_number: Optional[int] = None
    field_key: Optional[str] = None
    declared_value: Optional[str] = None
    observed_value: Optional[str] = None
    comparison_note: Optional[str] = None
    source: str
    timestamp: Optional[datetime] = None


class ReviewSummaryResponse(BaseModel):
    application_id: str
    application_title: str
    application_status: str
    category_name: Optional[str] = None
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    created_at: datetime
    documents_summary: Dict[str, Any]
    validation_summary: Dict[str, Any]
    anomaly_summary: Dict[str, Any]
    rule_explanations: List[RuleExplanationItem] = Field(default_factory=list)
    anomalies: List[AnomalyFindingItem] = Field(default_factory=list)
    evidence_items: List[EvidenceTraceItem] = Field(default_factory=list)
    recommended_actions: List[ActionRecommendation] = Field(default_factory=list)
    disclaimer: str = (
        "VerityAI Decision Support Layer: Automated validation results and AI-assisted findings "
        "are advisory only. Final regulatory determinations must be made by authorized human reviewers."
    )


class ScrutinyReportResponse(BaseModel):
    id: str
    application_id: str
    generated_by_id: Optional[str] = None
    report_type: str
    format: str
    file_size_bytes: int
    created_at: datetime
    summary_snapshot: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class ReportGenerationRequest(BaseModel):
    format: str = "PDF"  # "PDF" or "JSON"
    include_evidence_detail: bool = True
