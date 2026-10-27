from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ─── Integration Client Management ──────────────────────────────────────────

class IntegrationClientCreate(BaseModel):
    client_name: str = Field(..., min_length=3, max_length=150, description="Name of external platform/system")
    description: Optional[str] = Field(None, max_length=500, description="Integration purpose and contact")
    scopes: Optional[List[str]] = Field(
        default=["scrutiny:create", "scrutiny:read", "documents:upload"],
        description="Granted capabilities"
    )


class IntegrationClientCreatedResponse(BaseModel):
    client_id: str
    client_name: str
    description: Optional[str] = None
    client_secret: str = Field(..., description="Plain-text API secret. Displayed only ONCE upon creation.")
    secret_prefix: str
    scopes: List[str]
    created_at: datetime
    warning: str = "Copy and securely store client_secret now. It will never be displayed again."


class IntegrationClientResponse(BaseModel):
    client_id: str
    client_name: str
    description: Optional[str] = None
    secret_prefix: str
    scopes: List[str]
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


# ─── Scrutiny Jobs via Public Gateway ────────────────────────────────────────

class IntegrationJobCreate(BaseModel):
    external_reference: str = Field(..., min_length=2, max_length=100, description="Caller's external application reference")
    category_code: str = Field(default="ENGINEERING_AND_TECHNOLOGY", description="Statutory regulatory category")
    declared_data: Dict[str, Any] = Field(default_factory=dict, description="Institutional declared metrics")
    idempotency_key: Optional[str] = Field(None, max_length=100, description="Optional idempotency key to prevent duplicates")


class IntegrationJobResponse(BaseModel):
    job_id: str
    client_id: str
    external_reference: str
    status: str
    stage: str
    category_code: str
    submitted_documents_count: int
    duration_ms: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    polling_url: str


class FindingItem(BaseModel):
    finding_id: str
    category: str
    severity: str
    title: str
    description: str
    rule_code: Optional[str] = None
    evidence_text: Optional[str] = None
    document_id: Optional[str] = None
    page_number: Optional[int] = None
    confidence: float = 1.0


class IntegrationJobResultsResponse(BaseModel):
    job_id: str
    client_id: str
    external_reference: str
    status: str
    stage: str
    summary: Dict[str, Any]
    findings: List[Dict[str, Any]]
    rule_results: List[Dict[str, Any]]
    provider_metadata: Dict[str, Any]
    completed_at: Optional[datetime] = None
    report_available: bool = False


class IntegrationHealthResponse(BaseModel):
    status: str
    platform: str
    version: str
    capabilities: List[str]
    ocr_engine: str
    ai_provider_mode: str
    timestamp: datetime
