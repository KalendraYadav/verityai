from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict


class ScrutinyJobCreate(BaseModel):
    job_type: str = "FULL_SCRUTINY"


class ScrutinyJobResponse(BaseModel):
    id: str
    application_id: str
    job_type: str
    status: str
    triggered_by: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    retry_count: int = 0
    max_retries: int = 2
    error_code: Optional[str] = None
    safe_error_summary: Optional[str] = None
    stage_details: Dict[str, Any] = {}
    results_summary: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScrutinyJobListItem(BaseModel):
    id: str
    application_id: str
    job_type: str
    status: str
    triggered_by: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    retry_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
