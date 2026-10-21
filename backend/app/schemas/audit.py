from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class AuditEventResponse(BaseModel):
    id: str
    event_type: str
    actor_id: Optional[str] = None
    actor_type: str
    application_id: Optional[str] = None
    document_id: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    occurred_at: datetime
    request_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(None, alias="metadata_json")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
