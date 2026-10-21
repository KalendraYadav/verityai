import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent


def record_audit_event(
    db: Session,
    event_type: str,
    actor_id: Optional[str] = None,
    actor_type: str = "USER",
    application_id: Optional[str] = None,
    document_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> AuditEvent:
    """Record an append-only audit event in the current transaction."""
    event = AuditEvent(
        id=str(uuid.uuid4()),
        event_type=event_type,
        actor_id=actor_id,
        actor_type=actor_type,
        application_id=application_id,
        document_id=document_id,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata or {},
        request_id=request_id,
    )
    db.add(event)
    return event
