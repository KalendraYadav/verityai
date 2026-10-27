from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.institution import Institution
from app.schemas.common import DataResponse
from app.schemas.institution import InstitutionCreate, InstitutionResponse
from app.core.exceptions import NotFoundException

router = APIRouter()


@router.get("", response_model=DataResponse[List[InstitutionResponse]])
def list_institutions(db: Session = Depends(get_db)):
    """List all institutions."""
    stmt = select(Institution).order_by(Institution.institution_name)
    institutions = db.scalars(stmt).all()
    return DataResponse(data=[InstitutionResponse.model_validate(inst) for inst in institutions])


@router.get("/{institution_id}", response_model=DataResponse[InstitutionResponse])
def get_institution(institution_id: str, db: Session = Depends(get_db)):
    """Retrieve an institution by ID."""
    stmt = select(Institution).where(
        (Institution.id == institution_id) | (Institution.institution_identifier == institution_id)
    )
    institution = db.scalar(stmt)
    if not institution:
        raise NotFoundException(
            code="INSTITUTION_NOT_FOUND",
            message=f"Institution with ID or identifier '{institution_id}' was not found.",
        )
    return DataResponse(data=InstitutionResponse.model_validate(institution))


from app.api.deps import require_roles
from app.models.user import User
from app.services.audit import record_audit_event


@router.post("", response_model=DataResponse[InstitutionResponse], status_code=status.HTTP_201_CREATED, summary="Create a new institution (Admin only)")
def create_institution(
    payload: InstitutionCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("ADMIN")),
):
    """Create a new institution record. Strictly restricted to Regulatory Administrators."""
    institution = Institution(
        institution_name=payload.institution_name,
        institution_identifier=payload.institution_identifier,
        institution_type=payload.institution_type,
        state=payload.state,
        city=payload.city,
    )
    db.add(institution)
    db.flush()

    record_audit_event(
        db=db,
        event_type="INSTITUTION_CREATED",
        actor_id=admin_user.id,
        actor_type="USER",
        metadata={
            "institution_id": institution.id,
            "institution_name": institution.institution_name,
            "identifier": institution.institution_identifier,
        },
    )
    db.commit()
    db.refresh(institution)
    return DataResponse(data=InstitutionResponse.model_validate(institution))
