from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ApplicationVersionItem(BaseModel):
    id: str
    application_id: str
    version_number: int
    change_summary: str
    changed_fields: Optional[Dict[str, Any]] = None
    snapshot_data: Dict[str, Any]
    created_by_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VersionDifferenceItem(BaseModel):
    field: str
    v1_value: Any = None
    v2_value: Any = None
    is_changed: bool


class VersionComparisonResponse(BaseModel):
    application_id: str
    v1_version: int
    v1_created_at: str
    v2_version: int
    v2_created_at: str
    total_fields: int
    changed_fields_count: int
    differences: List[VersionDifferenceItem]


class DocumentRevisionItem(BaseModel):
    id: str
    document_id: str
    revision_number: int
    storage_key: str
    original_filename: str
    file_size_bytes: int
    sha256: str
    change_reason: Optional[str] = None
    uploaded_by_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationFreshnessResponse(BaseModel):
    application_id: str
    current_version: int
    is_overall_fresh: bool
    validation_status: str
    validation_stale: bool
    latest_validation_run_id: Optional[str] = None
    report_status: str
    report_stale: bool
    latest_report_id: Optional[str] = None
