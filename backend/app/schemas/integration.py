from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ExternalPortalConfigResponse(BaseModel):
    id: str
    provider_id: str
    name: str
    provider_type: str
    description: Optional[str] = None
    base_url: Optional[str] = None
    is_enabled: bool
    auth_type: str
    statutory_authority: str
    timeout_seconds: int
    is_synthetic: bool
    health_status: Optional[str] = None
    health_message: Optional[str] = None
    latency_ms: Optional[float] = None
    created_at: str


class ExternalPortalHealthResponse(BaseModel):
    provider_id: str
    status: str
    latency_ms: Optional[float] = None
    statutory_authority: str
    is_synthetic: bool
    message: str
    http_status: Optional[int] = None


class ExternalPortalSyncLogItem(BaseModel):
    id: str
    provider_id: str
    action: str
    target_identifier: Optional[str] = None
    status: str
    http_status_code: Optional[int] = None
    response_latency_ms: Optional[float] = None
    error_message: Optional[str] = None
    request_metadata: Optional[Dict[str, Any]] = None
    initiated_by_id: Optional[str] = None
    created_at: str


class ExternalVerificationTriggerRequest(BaseModel):
    provider_id: str = Field(..., description="ID of the regulatory portal adapter to query")


class ExternalVerificationCheckItem(BaseModel):
    check_name: str
    status: str
    declared_value: Optional[Any] = None
    portal_value: Optional[Any] = None
    explanation: str


class ExternalVerificationResponse(BaseModel):
    provider_id: str
    provider_name: str
    provider_type: str
    overall_status: str
    statutory_authority: str
    is_synthetic: bool
    retrieved_at: str
    target_identifier: str
    checks: List[ExternalVerificationCheckItem]
    provenance: Dict[str, Any]
