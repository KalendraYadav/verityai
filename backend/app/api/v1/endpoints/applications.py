from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.audit import AuditEvent
from app.schemas.common import DataResponse, PaginatedResponse, MetaPagination
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationListItem,
    ApplicationDetailResponse,
)
from app.schemas.institution import InstitutionBrief
from app.schemas.audit import AuditEventResponse
from app.core.exceptions import NotFoundException
from app.services.reference import generate_application_reference
from app.services.audit import record_audit_event

router = APIRouter()


def _get_or_create_demo_user(db: Session, institution_id: str) -> str:
    """Resolve a valid user ID for created_by in Phase 2."""
    # Look for an existing user bound to this institution
    user = db.scalar(select(User).where(User.institution_id == institution_id))
    if user:
        return user.id
    # Fallback to any user
    first_user = db.scalar(select(User))
    if first_user:
        return first_user.id
    # If database has no users yet, create a baseline demo institution user
    demo_user = User(
        id="USR-INST-01",
        email="institution.user@demo.verityai.invalid",
        display_name="Demo Institutional Representative",
        password_hash="$argon2id$v=19$m=65536,t=3,p=4$synthetic$hash",
        role="INSTITUTION_USER",
        institution_id=institution_id,
        data_origin="SYNTHETIC_DEMO",
    )
    db.add(demo_user)
    db.flush()
    return demo_user.id


@router.get("", response_model=PaginatedResponse[ApplicationListItem])
def list_applications(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    lifecycle_status: Optional[str] = Query(None, description="Filter by lifecycle status (e.g. DRAFT, SUBMITTED)"),
    pipeline_status: Optional[str] = Query(None, description="Filter by pipeline status"),
    category_code: Optional[str] = Query(None, description="Filter by category code"),
    institution_id: Optional[str] = Query(None, description="Filter by institution ID"),
    q: Optional[str] = Query(None, description="Search query for reference or institution name"),
    sort: Optional[str] = Query("-created_at", description="Sort field (e.g. -created_at, created_at, application_reference)"),
    db: Session = Depends(get_db),
):
    """List applications with pagination, filtering, and sorting."""
    stmt = (
        select(Application)
        .join(Application.institution)
        .options(joinedload(Application.institution))
    )

    if lifecycle_status:
        stmt = stmt.where(Application.lifecycle_status == lifecycle_status.upper())
    if pipeline_status:
        stmt = stmt.where(Application.pipeline_status == pipeline_status.upper())
    if category_code:
        stmt = stmt.where(Application.category_code == category_code)
    if institution_id:
        stmt = stmt.where(
            (Application.institution_id == institution_id)
            | (Institution.institution_identifier == institution_id)
        )
    if q:
        search_term = f"%{q.strip()}%"
        stmt = stmt.where(
            (Application.application_reference.ilike(search_term))
            | (Institution.institution_name.ilike(search_term))
        )

    # Count total matching rows
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0

    # Sorting
    if sort == "created_at":
        stmt = stmt.order_by(asc(Application.created_at))
    elif sort == "-updated_at":
        stmt = stmt.order_by(desc(Application.updated_at))
    elif sort == "updated_at":
        stmt = stmt.order_by(asc(Application.updated_at))
    elif sort == "application_reference":
        stmt = stmt.order_by(asc(Application.application_reference))
    else:  # default -created_at
        stmt = stmt.order_by(desc(Application.created_at))

    # Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)
    applications = db.scalars(stmt).unique().all()

    items = [
        ApplicationListItem(
            id=app.id,
            application_reference=app.application_reference,
            institution=InstitutionBrief.model_validate(app.institution),
            category_code=app.category_code,
            academic_year=app.academic_year,
            lifecycle_status=app.lifecycle_status,
            pipeline_status=app.pipeline_status,
            document_count=0,
            open_findings_count=None,
            created_at=app.created_at,
            updated_at=app.updated_at,
        )
        for app in applications
    ]

    return PaginatedResponse(
        data=items,
        meta=MetaPagination(page=page, page_size=page_size, total=total),
    )


@router.post("", response_model=DataResponse[ApplicationResponse], status_code=status.HTTP_201_CREATED)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    """Create a new draft application and record an audit event."""
    # Validate institution exists
    inst_stmt = select(Institution).where(
        (Institution.id == payload.institution_id)
        | (Institution.institution_identifier == payload.institution_id)
    )
    institution = db.scalar(inst_stmt)
    if not institution:
        raise NotFoundException(
            code="INSTITUTION_NOT_FOUND",
            message=f"Institution with ID or identifier '{payload.institution_id}' was not found.",
        )

    # Validate category exists
    cat_stmt = select(ApplicationCategory).where(ApplicationCategory.code == payload.category_code)
    category = db.scalar(cat_stmt)
    if not category:
        raise NotFoundException(
            code="CATEGORY_NOT_FOUND",
            message=f"Application category with code '{payload.category_code}' was not found.",
        )

    # Determine creator user ID
    creator_id = _get_or_create_demo_user(db, institution.id)

    # Generate reference number
    reference = generate_application_reference(db, payload.academic_year)

    application = Application(
        application_reference=reference,
        institution_id=institution.id,
        category_code=category.code,
        academic_year=payload.academic_year or "2026-27",
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data=payload.declared_data or {},
        created_by=creator_id,
        data_origin="SYNTHETIC_DEMO",
    )
    db.add(application)
    db.flush()

    # Append audit event in the same transaction
    record_audit_event(
        db=db,
        event_type="APPLICATION_CREATED",
        actor_id=creator_id,
        actor_type="USER",
        application_id=application.id,
        metadata={
            "application_reference": application.application_reference,
            "category_code": application.category_code,
            "institution_id": institution.id,
        },
    )

    db.commit()
    db.refresh(application)

    return DataResponse(data=ApplicationResponse.model_validate(application))


@router.get("/{application_id}", response_model=DataResponse[ApplicationDetailResponse])
def get_application(application_id: str, db: Session = Depends(get_db)):
    """Retrieve full application details by ID or reference."""
    stmt = (
        select(Application)
        .options(joinedload(Application.institution))
        .where(
            (Application.id == application_id)
            | (Application.application_reference == application_id)
        )
    )
    application = db.scalar(stmt)
    if not application:
        raise NotFoundException(
            code="APPLICATION_NOT_FOUND",
            message=f"Application '{application_id}' was not found.",
        )

    detail = ApplicationDetailResponse(
        id=application.id,
        application_reference=application.application_reference,
        institution_id=application.institution_id,
        category_code=application.category_code,
        academic_year=application.academic_year,
        lifecycle_status=application.lifecycle_status,
        pipeline_status=application.pipeline_status,
        declared_data=application.declared_data,
        submitted_at=application.submitted_at,
        assigned_reviewer_id=application.assigned_reviewer_id,
        created_by=application.created_by,
        data_origin=application.data_origin,
        created_at=application.created_at,
        updated_at=application.updated_at,
        institution=InstitutionBrief.model_validate(application.institution),
        documents_summary={"total": 0, "by_status": {}},
        current_validation_run_id=None,
    )
    return DataResponse(data=detail)


@router.get("/{application_id}/audit-events", response_model=DataResponse[List[AuditEventResponse]])
def get_application_audit_events(application_id: str, db: Session = Depends(get_db)):
    """Retrieve the audit timeline for an application."""
    # Ensure application exists
    app_stmt = select(Application.id).where(
        (Application.id == application_id) | (Application.application_reference == application_id)
    )
    app_id = db.scalar(app_stmt)
    if not app_id:
        raise NotFoundException(
            code="APPLICATION_NOT_FOUND",
            message=f"Application '{application_id}' was not found.",
        )

    stmt = (
        select(AuditEvent)
        .where(AuditEvent.application_id == app_id)
        .order_by(desc(AuditEvent.occurred_at))
    )
    events = db.scalars(stmt).all()
    return DataResponse(data=[AuditEventResponse.model_validate(e) for e in events])
