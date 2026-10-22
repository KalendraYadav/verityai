from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_optional_current_user, get_current_user, require_roles
from app.models.user import User
from app.models.registry import RegistryRecord, RegistryVerificationRun, RegistryVerificationResult
from app.schemas.registry import (
    RegistryProviderInfo,
    RegistryRecordResponse,
    RegistryImportRequest,
    RegistryImportResponse,
    RegistryVerificationTriggerRequest,
    RegistryVerificationRunResponse,
    RegistryVerificationResultResponse,
    DiscrepancyResolveRequest,
)
from app.services.registry import (
    list_registry_providers,
    import_registry_dataset,
    verify_application_registry,
    resolve_registry_discrepancy,
)

router = APIRouter()


@router.get("/registry/providers", response_model=List[RegistryProviderInfo])
def get_providers():
    """List available registry verification adapters with operational status."""
    return list_registry_providers()


@router.post("/registry/imports", response_model=RegistryImportResponse)
def import_records(
    payload: RegistryImportRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Import authorized regulatory reference records.
    Restricted to ADMIN role when authenticated.
    """
    if current_user and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "Only administrators can import registry datasets."
            }
        )

    records_data = [r.model_dump() for r in payload.records]
    actor_id = current_user.id if current_user else None
    result = import_registry_dataset(
        db=db,
        records_data=records_data,
        provider_code=payload.provider_code,
        source_dataset=payload.source_dataset,
        dataset_version=payload.dataset_version,
        actor_id=actor_id
    )
    return result


@router.get("/registry/records", response_model=List[RegistryRecordResponse])
def list_records(
    provider_code: str = Query("SYNTHETIC_AISHE"),
    q: Optional[str] = Query(None, description="Search term across name or identifier"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Search and browse imported registry records."""
    query = db.query(RegistryRecord).filter(RegistryRecord.provider_code == provider_code)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            (RegistryRecord.institution_name.ilike(term)) |
            (RegistryRecord.reference_identifier.ilike(term))
        )
    return query.order_by(RegistryRecord.institution_name.asc()).offset(offset).limit(limit).all()


@router.post("/applications/{application_id}/registry-verification", response_model=RegistryVerificationRunResponse)
def trigger_verification(
    application_id: str,
    payload: RegistryVerificationTriggerRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Trigger statutory registry verification against reference records."""
    actor_id = current_user.id if current_user else None
    run = verify_application_registry(
        db=db,
        application_id=application_id,
        provider_code=payload.provider_code,
        actor_id=actor_id
    )
    return run


@router.get("/applications/{application_id}/registry-verification", response_model=List[RegistryVerificationRunResponse])
def get_application_verification_runs(
    application_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve all regulatory verification runs for an application, latest first."""
    runs = (
        db.query(RegistryVerificationRun)
        .filter(RegistryVerificationRun.application_id == application_id)
        .order_by(RegistryVerificationRun.executed_at.desc())
        .all()
    )
    return runs


@router.get("/registry-verification/{result_id}", response_model=RegistryVerificationResultResponse)
def get_verification_result(
    result_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve single itemized verification result with evidence and explanation."""
    res = db.query(RegistryVerificationResult).filter(RegistryVerificationResult.id == result_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Verification result '{result_id}' not found."}
        )
    return res


@router.patch("/registry-verification/{result_id}/resolve", response_model=RegistryVerificationResultResponse)
def resolve_discrepancy_endpoint(
    result_id: str,
    payload: DiscrepancyResolveRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Human reviewer resolves or waives a discrepancy found during registry verification."""
    actor_id = current_user.id if current_user else None
    res = resolve_registry_discrepancy(
        db=db,
        result_id=result_id,
        resolution_status=payload.resolution_status,
        resolution_notes=payload.resolution_notes,
        actor_id=actor_id
    )
    return res
