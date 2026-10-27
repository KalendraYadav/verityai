from datetime import datetime, date
import re
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.institution import InstitutionBrief, InstitutionResponse

ACADEMIC_YEAR_REGEX = re.compile(r"^\d{4}-\d{2}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

NUMERIC_NON_NEGATIVE_KEYS = {
    "approved_intake",
    "proposed_intake",
    "intake",
    "land_area_acres",
    "built_up_area_sqm",
    "total_built_up_area_sqm",
    "building_age_years",
    "faculty_count",
    "student_enrollment",
    "fsi_far_ratio",
    "total_technical_programmes",
}

INTEGER_KEYS = {
    "approved_intake",
    "proposed_intake",
    "intake",
    "building_age_years",
    "faculty_count",
    "student_enrollment",
    "total_technical_programmes",
}

TEXT_KEYS = {
    "principal_name",
    "institution_name",
    "programme_name",
    "certificate_number",
    "land_ownership_type",
}


def validate_academic_year_value(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if not v:
        raise ValueError("Academic year cannot be empty.")
    if not ACADEMIC_YEAR_REGEX.match(v):
        raise ValueError("Academic year must be formatted as YYYY-YY (e.g. 2026-27).")
    return v


def validate_category_code_value(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = v.strip()
    if not v:
        raise ValueError("Category code cannot be empty.")
    return v


def validate_declared_data_dict(v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if v is None:
        return v
    for key, value in v.items():
        # Check date fields
        if ("date" in key.lower() or "expiry" in key.lower()) and isinstance(value, str) and value:
            if not DATE_PATTERN.match(value):
                raise ValueError(f"Field '{key}' must be formatted as YYYY-MM-DD")
            try:
                date.fromisoformat(value)
            except ValueError:
                raise ValueError(f"Field '{key}' is not a valid calendar date (YYYY-MM-DD)")

        # Check numeric non-negative metrics
        if key in NUMERIC_NON_NEGATIVE_KEYS:
            if value is None or value == "":
                continue
            if isinstance(value, bool):
                raise ValueError(f"Field '{key}' must be a number, not boolean")
            if isinstance(value, (int, float)):
                if value < 0:
                    raise ValueError(f"Field '{key}' cannot be negative (must be >= 0)")
                if key in INTEGER_KEYS and isinstance(value, float) and not value.is_integer():
                    raise ValueError(f"Field '{key}' must be an integer (whole number)")
            elif isinstance(value, str):
                try:
                    num_val = float(value)
                    if num_val < 0:
                        raise ValueError(f"Field '{key}' cannot be negative (must be >= 0)")
                    if key in INTEGER_KEYS and not num_val.is_integer():
                        raise ValueError(f"Field '{key}' must be an integer (whole number)")
                except ValueError:
                    raise ValueError(f"Field '{key}' must be a valid numeric value")
            else:
                raise ValueError(f"Field '{key}' must be a valid numeric value")

        # Check text fields
        if key in TEXT_KEYS:
            if value is not None and not isinstance(value, str):
                raise ValueError(f"Field '{key}' must be a string")

    return v


class ApplicationCreate(BaseModel):
    institution_id: str = Field(..., min_length=1, description="Target institution UUID or identifier")
    category_code: str = Field(..., min_length=1, description="Application category code (e.g., EOA_ILLUSTRATIVE)")
    academic_year: Optional[str] = Field("2026-27", description="Statutory academic year (e.g., 2026-27)")
    declared_data: Dict[str, Any] = Field(default_factory=dict, description="Declared institutional data fields")

    @field_validator("institution_id")
    @classmethod
    def validate_institution_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Institution ID cannot be empty.")
        return v

    @field_validator("category_code")
    @classmethod
    def validate_category_code(cls, v: str) -> str:
        return validate_category_code_value(v)

    @field_validator("academic_year")
    @classmethod
    def validate_academic_year(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            raise ValueError("Academic year cannot be null.")
        return validate_academic_year_value(v)

    @field_validator("declared_data")
    @classmethod
    def validate_declared(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        return validate_declared_data_dict(v) or {}


class ApplicationUpdate(BaseModel):
    category_code: Optional[str] = Field(None, min_length=1, description="Updated application category code")
    academic_year: Optional[str] = Field(None, description="Academic year (e.g., 2026-27)")
    declared_data: Optional[Dict[str, Any]] = Field(None, description="Updated declared institutional data fields")

    @field_validator("category_code")
    @classmethod
    def validate_category_code(cls, v: Optional[str]) -> Optional[str]:
        return validate_category_code_value(v)

    @field_validator("academic_year")
    @classmethod
    def validate_academic_year(cls, v: Optional[str]) -> Optional[str]:
        return validate_academic_year_value(v)

    @field_validator("declared_data")
    @classmethod
    def validate_declared(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        return validate_declared_data_dict(v)


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
