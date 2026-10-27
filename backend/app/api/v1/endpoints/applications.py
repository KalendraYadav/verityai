from datetime import datetime, timezone
import re
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
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationListItem,
    ApplicationDetailResponse,
)
from app.schemas.institution import InstitutionBrief
from app.schemas.audit import AuditEventResponse
from app.api.deps import get_optional_current_user
from app.core.exceptions import (
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
)
from app.services.reference import generate_application_reference
from app.services.audit import record_audit_event
from app.services.workflow import evaluate_conditional_checklist

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
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """List applications with pagination, filtering, and tenant isolation."""
    stmt = (
        select(Application)
        .join(Application.institution)
        .options(joinedload(Application.institution))
    )

    # Server-side tenant isolation for INSTITUTION_USER
    if current_user and current_user.role == "INSTITUTION_USER":
        if institution_id and institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Access to applications from another institution is denied.")
        stmt = stmt.where(Application.institution_id == current_user.institution_id)
    elif institution_id:
        stmt = stmt.where(
            (Application.institution_id == institution_id)
            | (Institution.institution_identifier == institution_id)
        )

    if lifecycle_status:
        stmt = stmt.where(Application.lifecycle_status == lifecycle_status.upper())
    if pipeline_status:
        stmt = stmt.where(Application.pipeline_status == pipeline_status.upper())
    if category_code:
        stmt = stmt.where(Application.category_code == category_code)
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
            document_count=len(app.documents) if hasattr(app, "documents") and app.documents else 0,
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
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    # Role boundary: Reviewers are strictly forbidden from creating institutional applications
    if current_user and current_user.role == "REVIEWER":
        raise ForbiddenException("FORBIDDEN", "Reviewers are not permitted to create institutional applications.")

    # Server-side tenant isolation: INSTITUTION_USER can only create applications for their bound institution
    if current_user and current_user.role == "INSTITUTION_USER":
        if payload.institution_id and payload.institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Cannot create applications for another institution.")
        target_institution_id = current_user.institution_id
    else:
        target_institution_id = payload.institution_id

    # Validate institution exists
    inst_stmt = select(Institution).where(
        (Institution.id == target_institution_id)
        | (Institution.institution_identifier == target_institution_id)
    )
    institution = db.scalar(inst_stmt)
    if not institution:
        raise NotFoundException(
            code="INSTITUTION_NOT_FOUND",
            message=f"Institution with ID or identifier '{target_institution_id}' was not found.",
        )

    if current_user:
        creator_id = current_user.id
    else:
        creator_id = _get_or_create_demo_user(db, institution.id)

    # Validate category exists
    cat_stmt = select(ApplicationCategory).where(ApplicationCategory.code == payload.category_code)
    category = db.scalar(cat_stmt)
    if not category:
        raise NotFoundException(
            code="CATEGORY_NOT_FOUND",
            message=f"Application category with code '{payload.category_code}' was not found.",
        )

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
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve full application details by ID or reference with tenant scoping."""
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

    # Server-side tenant verification for INSTITUTION_USER
    if current_user and current_user.role == "INSTITUTION_USER":
        if application.institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Access to application from another institution is denied.")

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
        documents_summary={"total": len(application.documents) if hasattr(application, "documents") and application.documents else 0, "by_status": {}},
        current_validation_run_id=None,
    )
    return DataResponse(data=detail)


@router.patch(
    "/{application_id}",
    response_model=DataResponse[ApplicationResponse],
    summary="Update declared data or metadata for a draft application",
)
def update_draft_application(
    application_id: str,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Save or update draft application details.
    Enforces tenant isolation and rejects edits if application is already submitted.
    """
    app = db.scalar(
        select(Application).where(
            (Application.id == application_id) | (Application.application_reference == application_id)
        )
    )
    if not app:
        raise NotFoundException(
            code="APPLICATION_NOT_FOUND",
            message=f"Application '{application_id}' not found.",
        )

    # Role boundary: Reviewers are strictly forbidden from modifying applicant drafts or declarations
    if current_user and current_user.role == "REVIEWER":
        raise ForbiddenException("FORBIDDEN", "Reviewers are not permitted to modify applicant drafts or declared metrics.")

    # Tenant isolation
    if current_user and current_user.role == "INSTITUTION_USER":
        if app.institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Cannot update application belonging to another institution.")

    # State locking
    if app.lifecycle_status != "DRAFT":
        raise ConflictException(
            code="APPLICATION_LOCKED",
            message=f"Application cannot be updated because it is in '{app.lifecycle_status}' status. Only DRAFT applications can be modified.",
        )

    if payload.category_code is not None:
        cat = db.scalar(select(ApplicationCategory).where(ApplicationCategory.code == payload.category_code))
        if not cat:
            raise NotFoundException("CATEGORY_NOT_FOUND", f"Category '{payload.category_code}' was not found.")
        app.category_code = payload.category_code

    if payload.academic_year is not None:
        app.academic_year = payload.academic_year

    if payload.declared_data is not None:
        merged_data = dict(app.declared_data or {})
        merged_data.update(payload.declared_data)
        app.declared_data = merged_data

    app.updated_at = datetime.now(timezone.utc)

    actor_id = current_user.id if current_user else app.created_by
    record_audit_event(
        db=db,
        event_type="APPLICATION_UPDATED",
        actor_id=actor_id,
        actor_type="USER",
        application_id=app.id,
        entity_type="application",
        entity_id=app.id,
        metadata={"updated_fields": list(payload.model_dump(exclude_unset=True).keys())},
    )

    db.commit()
    db.refresh(app)
    return DataResponse(data=ApplicationResponse.model_validate(app))


@router.post(
    "/{application_id}/submit",
    response_model=DataResponse[ApplicationResponse],
    summary="Submit application with statutory completeness validation (Decision 2 Option A)",
)
def submit_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Formally submit a draft application for scrutiny.
    Enforces Decision 2: Option A (Blocks submission if mandatory statutory documents are missing).
    """
    app = db.scalar(
        select(Application).where(
            (Application.id == application_id) | (Application.application_reference == application_id)
        )
    )
    if not app:
        raise NotFoundException(
            code="APPLICATION_NOT_FOUND",
            message=f"Application '{application_id}' not found.",
        )

    if current_user and current_user.role == "INSTITUTION_USER":
        if app.institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Access to application from another institution is denied.")

    if app.lifecycle_status != "DRAFT":
        raise ConflictException(
            code="INVALID_STATE_TRANSITION",
            message=f"Only DRAFT applications can be submitted. Current status: '{app.lifecycle_status}'."
        )

    # Validate academic year
    if not app.academic_year or not re.match(r"^\d{4}-\d{2}$", app.academic_year.strip()):
        raise BadRequestException(
            code="APPLICATION_INCOMPLETE",
            message="Cannot submit application. Academic year is required and must follow YYYY-YY format (e.g. 2026-27)."
        )

    # Validate category exists
    cat = db.scalar(select(ApplicationCategory).where(ApplicationCategory.code == app.category_code))
    if not cat:
        raise NotFoundException(
            code="CATEGORY_NOT_FOUND",
            message=f"Application category '{app.category_code}' was not found."
        )

    # Validate category-specific required declared fields
    decl = app.declared_data or {}
    if cat.required_declared_fields:
        missing_fields = []
        for field in cat.required_declared_fields:
            val = decl.get(field)
            if val is None or (isinstance(val, str) and not val.strip()):
                missing_fields.append(field)
        if missing_fields:
            raise BadRequestException(
                code="APPLICATION_INCOMPLETE",
                message=f"Cannot submit application. Missing {len(missing_fields)} mandatory declared field(s): {', '.join(missing_fields)}"
            )

    # Validate declared numeric metrics are valid and non-negative
    for key, val in decl.items():
        if key in ("approved_intake", "proposed_intake", "intake", "building_age_years", "faculty_count", "student_enrollment"):
            if val is not None and not isinstance(val, bool):
                try:
                    num = float(val)
                    if num < 0:
                        raise BadRequestException(
                            code="APPLICATION_INCOMPLETE",
                            message=f"Declared metric '{key}' cannot be negative ({val})."
                        )
                except (ValueError, TypeError):
                    raise BadRequestException(
                        code="APPLICATION_INCOMPLETE",
                        message=f"Declared metric '{key}' must be a valid integer."
                    )
        elif key in ("land_area_acres", "built_up_area_sqm", "total_built_up_area_sqm", "fsi_far_ratio"):
            if val is not None and not isinstance(val, bool):
                try:
                    num = float(val)
                    if num < 0:
                        raise BadRequestException(
                            code="APPLICATION_INCOMPLETE",
                            message=f"Declared metric '{key}' cannot be negative ({val})."
                        )
                except (ValueError, TypeError):
                    raise BadRequestException(
                        code="APPLICATION_INCOMPLETE",
                        message=f"Declared metric '{key}' must be a valid number."
                    )

    # Validate mandatory statutory checklist completeness (Decision 2 Option A)
    checklist = evaluate_conditional_checklist(db=db, application_id=app.id)
    missing_mandatory = [
        item for item in checklist.items
        if item.mandatory_or_conditional == "MANDATORY" and (item.status == "REQUIRED_MISSING" or not item.is_present)
    ]
    if missing_mandatory:
        raise BadRequestException(
            code="SUBMISSION_CHECKLIST_INCOMPLETE",
            message=f"Cannot submit application. Missing {len(missing_mandatory)} mandatory statutory document(s): {', '.join(m.title for m in missing_mandatory)}"
        )

    app.lifecycle_status = "SUBMITTED"
    app.submitted_at = datetime.now(timezone.utc)
    app.updated_at = datetime.now(timezone.utc)

    actor_id = current_user.id if current_user else app.created_by
    record_audit_event(
        db=db,
        event_type="APPLICATION_SUBMITTED",
        actor_id=actor_id,
        actor_type="USER",
        application_id=app.id,
        entity_type="application",
        entity_id=app.id,
        metadata={
            "application_reference": app.application_reference,
            "submitted_at": app.submitted_at.isoformat(),
            "checklist_items_total": len(checklist.items),
        },
    )

    db.commit()
    db.refresh(app)
    return DataResponse(data=ApplicationResponse.model_validate(app))


@router.get("/{application_id}/audit-events", response_model=DataResponse[List[AuditEventResponse]])
def get_application_audit_events(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve the audit timeline for an application with tenant scoping."""
    # Ensure application exists
    app_stmt = select(Application).where(
        (Application.id == application_id) | (Application.application_reference == application_id)
    )
    app = db.scalar(app_stmt)
    if not app:
        raise NotFoundException(
            code="APPLICATION_NOT_FOUND",
            message=f"Application '{application_id}' was not found.",
        )

    if current_user and current_user.role == "INSTITUTION_USER":
        if app.institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Access to audit trail from another institution is denied.")

    stmt = (
        select(AuditEvent)
        .where(AuditEvent.application_id == app.id)
        .order_by(desc(AuditEvent.occurred_at))
    )
    events = db.scalars(stmt).all()
    return DataResponse(data=[AuditEventResponse.model_validate(e) for e in events])
