from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RegistryProviderInfo(BaseModel):
    provider_code: str
    provider_name: str
    description: str
    is_synthetic: bool
    is_available: bool
    status: str
    statutory_authority: str
    requires_network: bool
    notes: Optional[str] = None


class RegistryRecordCreate(BaseModel):
    reference_identifier: str = Field(..., min_length=1, max_length=128)
    institution_name: str = Field(..., min_length=1, max_length=255)
    state: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    approved_intake: Optional[int] = None
    year_of_establishment: Optional[int] = None
    is_stale: Optional[bool] = False
    metadata_json: Optional[Dict[str, Any]] = None


class RegistryRecordResponse(BaseModel):
    id: str
    provider_code: str
    reference_identifier: str
    institution_name: str
    institution_name_normalized: str
    state: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    status: str
    approved_intake: Optional[int] = None
    year_of_establishment: Optional[int] = None
    source_dataset: str
    dataset_version: str
    is_stale: bool
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RegistryImportRequest(BaseModel):
    provider_code: str = "SYNTHETIC_AISHE"
    source_dataset: str = "SYNTHETIC_REGISTRY_2026"
    dataset_version: str = "1.0"
    records: List[RegistryRecordCreate]


class RegistryImportResponse(BaseModel):
    provider_code: str
    source_dataset: str
    dataset_version: str
    created_count: int
    updated_count: int
    total_processed: int


class RegistryVerificationTriggerRequest(BaseModel):
    provider_code: str = "SYNTHETIC_AISHE"


class RegistryVerificationResultResponse(BaseModel):
    id: str
    run_id: str
    check_type: str
    status: str
    application_value: Optional[str] = None
    registry_value: Optional[str] = None
    explanation: str
    discrepancy_details: Optional[Dict[str, Any]] = None
    requires_human_review: bool
    resolved_by_id: Optional[str] = None
    resolution_status: str
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RegistryVerificationRunResponse(BaseModel):
    id: str
    application_id: str
    provider_code: str
    overall_status: str
    summary: Optional[str] = None
    reference_record_id: Optional[str] = None
    executed_by_id: Optional[str] = None
    executed_at: datetime
    results: List[RegistryVerificationResultResponse] = []

    model_config = ConfigDict(from_attributes=True)


class DiscrepancyResolveRequest(BaseModel):
    resolution_status: str = Field(..., description="ACCEPTED, WAIVED, FLAGGED, or UNRESOLVED")
    resolution_notes: str = Field(..., min_length=3, max_length=1000)
