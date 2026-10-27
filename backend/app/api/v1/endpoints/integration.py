from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_optional_current_user, get_current_user, require_roles
from app.models.user import User
from app.schemas.integration import (
    ExternalPortalConfigResponse,
    ExternalPortalHealthResponse,
    ExternalPortalSyncLogItem,
    ExternalVerificationTriggerRequest,
    ExternalVerificationResponse,
)
from app.services.integration import (
    get_portal_providers,
    get_portal_provider,
    check_portal_gateway_health,
    execute_external_portal_verification,
    get_integration_sync_history,
)
from app.core.exceptions import NotFoundException, ValidationException

router = APIRouter()


@router.get("/integrations/providers", response_model=List[ExternalPortalConfigResponse])
def list_regulatory_portal_providers(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    List all configured external regulatory portals, gateway adapters, and statutory stubs.
    Reports operational status and latency.
    """
    return get_portal_providers(db)


@router.get("/integrations/providers/{provider_id}", response_model=ExternalPortalConfigResponse)
def get_regulatory_portal_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve detailed discovery metadata for a specific regulatory portal adapter."""
    try:
        return get_portal_provider(db, provider_id)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)


@router.get("/integrations/providers/{provider_id}/status", response_model=ExternalPortalHealthResponse, summary="Probe portal gateway health (Admin only)")
def probe_regulatory_portal_health(
    provider_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("ADMIN")),
):
    """Trigger an active health check probe against an external portal gateway. Strictly requires ADMIN role."""
    try:
        return check_portal_gateway_health(
            db=db,
            provider_id=provider_id,
            actor_id=admin_user.id,
        )
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)


@router.post("/applications/{application_id}/external-verification", response_model=ExternalVerificationResponse)
def trigger_external_portal_verification(
    application_id: str,
    payload: ExternalVerificationTriggerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """
    Execute compliance verification against an external regulatory portal adapter.
    Normalizes the returned record and preserves discrepancy evidence.
    """
    try:
        return execute_external_portal_verification(
            db=db,
            application_id=application_id,
            provider_id=payload.provider_id,
            actor_id=current_user.id,
        )
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.detail)


@router.get("/integrations/history", response_model=List[ExternalPortalSyncLogItem])
def get_portal_synchronization_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve chronological outbound regulatory sync and health check logs."""
    return get_integration_sync_history(db, limit=limit)
