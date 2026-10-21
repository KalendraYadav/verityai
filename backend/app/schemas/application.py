from datetime import datetime, date
import re
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.institution import InstitutionBrief, InstitutionResponse


class ApplicationCreate(BaseModel):
    institution_id: str = Field(..., description="Target institution UUID or identifier")
    category_code: str = Field(..., description="Application category code (e.g., EOA_ILLUSTRATIVE)")
    academic_year: Optional[str] = Field("2026-27", description="Academic year (e.g., 2026-27)")
    declared_data: Dict[str, Any] = Field(default_factory=dict, description="Declared institutional data fields")

    @field_validator("declared_data")
    @classmethod
    def validate_declared_dates(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Validate date fields in declared_data conform to YYYY-MM-DD."""
        date_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        for key, value in v.items():
            if ("date" in key.lower() or "expiry" in key.lower()) and isinstance(value, str) and value:
                if not date_pattern.match(value):
                    raise ValueError(f"Field '{key}' must be formatted as YYYY-MM-DD")
                try:
                    date.fromisoformat(value)
                except ValueError:
                    raise ValueError(f"Field '{key}' is not a valid calendar date (YYYY-MM-DD)")
        return v


class ApplicationResponse(BaseModel):
    id: str
    application_reference: str
    institution_id: str
    category_code: str
    academic_year: Optional[str] = None
    lifecycle_status: str
    pipeline_status: str
    declared_data: Dict[str, Any] = {}
    submitted_at: Optional[datetime] = None
    assigned_reviewer_id: Optional[str] = None
    created_by: str
    data_origin: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationListItem(BaseModel):
    id: str
    application_reference: str
    institution: InstitutionBrief
    category_code: str
    academic_year: Optional[str] = None
    lifecycle_status: str
    pipeline_status: str
    document_count: int = 0
    open_findings_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationDetailResponse(ApplicationResponse):
    institution: InstitutionBrief
    documents_summary: Dict[str, Any] = {"total": 0, "by_status": {}}
    current_validation_run_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
