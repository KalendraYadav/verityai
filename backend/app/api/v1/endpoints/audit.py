from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.audit import AuditEvent
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.audit import AuditEventResponse
from app.api.deps import require_roles

router = APIRouter()


@router.get("", response_model=DataResponse[List[AuditEventResponse]], summary="List global audit events (Admin only)")
def list_audit_events(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of audit events to return"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("ADMIN")),
):
    """Retrieve recent platform audit events. Strictly restricted to Regulatory Administrators."""
    stmt = select(AuditEvent).order_by(desc(AuditEvent.occurred_at)).limit(limit)
    events = db.scalars(stmt).all()
    return DataResponse(data=[AuditEventResponse.model_validate(e) for e in events])
