from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ValidationRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rule_code: str
    rule_version: str
    rule_name: str
    description: str
    rule_type: str
    category: str
    applies_to: Dict[str, Any]
    parameters: Dict[str, Any]
    severity: str
    on_fail_status: str
    provenance: str
    enabled: bool
    created_at: datetime
    updated_at: datetime


class RuleResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    validation_run_id: str
    application_id: str
    rule_id: str
    rule_code: str
    rule_version: str
    rule_type: str
    target_key: str
    status: str
    severity: str
    explanation: str
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    source_document_id: Optional[str] = None
    source_page_number: Optional[int] = None
    evidence_payload: Dict[str, Any] = Field(default_factory=dict)
    inputs_status: str
    human_review_required: bool
    unresolved_reason: Optional[str] = None
    evaluation_date_used: date
    evaluated_at: datetime


class ValidationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    status: str
    trigger: str
    evaluation_date: date
    pipeline_version: str
    summary: Optional[Dict[str, Any]] = None
    is_current: bool
    error_code: Optional[str] = None
    safe_error_summary: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class ValidationSummaryResponse(BaseModel):
    application_id: str
    validation_run_id: Optional[str] = None
    status: str
    evaluation_date: Optional[date] = None
    pipeline_version: str = "0.2.0"
    total_rules: int = 0
    passed: int = 0
    failed: int = 0
    needs_review: int = 0
    not_applicable: int = 0
    unable_to_evaluate: int = 0
    is_compliant: bool = False
    evaluated_at: Optional[datetime] = None
    results: List[RuleResultResponse] = Field(default_factory=list)


class ValidationTriggerRequest(BaseModel):
    evaluation_date: Optional[date] = None
    force: bool = False
