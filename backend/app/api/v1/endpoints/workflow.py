from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.application import Application
from app.core.exceptions import NotFoundException, ForbiddenException
from app.schemas.common import DataResponse, PaginatedResponse, MetaPagination
from app.schemas.workflow import (
    WorkflowStatusResponse,
    ApplicationReadinessResponse,
    WorkflowTransitionRequest,
    ScrutinyQueueItem,
    ApplicationChecklistResponse,
)
from app.api.deps import get_current_user, get_optional_current_user, require_roles
from app.services.workflow import (
    start_or_resume_workflow,
    get_workflow_status,
    get_application_readiness,
    evaluate_conditional_checklist,
    transition_application_state,
    list_scrutiny_queue,
)

router = APIRouter()


@router.post(
    "/applications/{application_id}/workflow/start",
    response_model=DataResponse[WorkflowStatusResponse],
    summary="Start or resume end-to-end application scrutiny workflow",
)
def trigger_workflow_start(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """Trigger or resume complete scrutiny pipeline: document checking, validation engine,
    and AI-assisted cross-document anomaly detection.
    """
    result = start_or_resume_workflow(db=db, application_id=application_id, actor_id=current_user.id)
    return DataResponse(data=result)


@router.get(
    "/applications/{application_id}/workflow",
    response_model=DataResponse[WorkflowStatusResponse],
    summary="Retrieve application workflow and stage progression status",
)
def retrieve_workflow_status(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns structured stage status across documents, extraction, validation, anomalies, and review."""
    app_obj = db.get(Application, application_id)
    if not app_obj:
        raise NotFoundException("APPLICATION_NOT_FOUND", f"Application '{application_id}' not found.")

    if current_user.role == "INSTITUTION_USER":
        if app_obj.institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Access to application workflow from another institution is denied.")
    elif current_user.role not in ("ADMIN", "REVIEWER"):
        raise ForbiddenException("FORBIDDEN", f"Role '{current_user.role}' is not authorized to access application workflow.")

    result = get_workflow_status(db=db, application_id=application_id)
    return DataResponse(data=result)


@router.get(
    "/applications/{application_id}/readiness",
    response_model=DataResponse[ApplicationReadinessResponse],
    summary="Retrieve multi-dimensional scrutiny readiness assessment",
)
def retrieve_application_readiness(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculates readiness across documents, extraction, deterministic validation, and anomalies.
    Provides actionable blockers and recommended next actions without collapsing into artificial percentages.
    """
    app_obj = db.get(Application, application_id)
    if not app_obj:
        raise NotFoundException("APPLICATION_NOT_FOUND", f"Application '{application_id}' not found.")

    if current_user.role == "INSTITUTION_USER":
        if app_obj.institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Access to application readiness from another institution is denied.")
    elif current_user.role not in ("ADMIN", "REVIEWER"):
        raise ForbiddenException("FORBIDDEN", f"Role '{current_user.role}' is not authorized to access application readiness.")

    result = get_application_readiness(db=db, application_id=application_id)
    return DataResponse(data=result)



@router.get(
    "/applications/{application_id}/checklist",
    response_model=DataResponse[ApplicationChecklistResponse],
    summary="Retrieve application conditional document requirements and checklist status",
)
def retrieve_application_checklist(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Evaluates dynamic conditional document checklist based on application category,
    declared property/land ownership, building age, intake increase, and APH 2024-27 norms.
    """
    app_obj = db.get(Application, application_id)
    if not app_obj:
        raise NotFoundException("APPLICATION_NOT_FOUND", f"Application '{application_id}' not found.")

    if current_user and current_user.role == "INSTITUTION_USER":
        if app_obj.institution_id != current_user.institution_id:
            raise ForbiddenException("FORBIDDEN", "Access to application checklist from another institution is denied.")

    result = evaluate_conditional_checklist(db=db, application_id=application_id)
    return DataResponse(data=result)


@router.post(
    "/applications/{application_id}/workflow/transitions",
    response_model=DataResponse[WorkflowStatusResponse],
    summary="Execute application lifecycle state transition",
)
def execute_lifecycle_transition(
    application_id: str,
    payload: WorkflowTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """Enforces state machine rules and transitions application to target state:
    DRAFT -> SUBMITTED -> UNDER_SCRUTINY -> (ACTION_REQUIRED | SCRUTINY_COMPLETED).
    """
    transition_application_state(
        db=db,
        application_id=application_id,
        target_status=payload.target_status,
        actor_id=current_user.id,
        reason=payload.reason,
        reviewer_notes=payload.reviewer_notes,
    )
    result = get_workflow_status(db=db, application_id=application_id)
    return DataResponse(data=result)


@router.get(
    "/scrutiny-queue",
    response_model=PaginatedResponse[ScrutinyQueueItem],
    summary="List applications in scrutiny queue with readiness assessment",
)
def get_scrutiny_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    readiness_state: Optional[str] = Query(None, description="Filter by readiness state"),
    lifecycle_status: Optional[str] = Query(None, description="Filter by lifecycle status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """Returns prioritized queue of applications awaiting or undergoing official scrutiny."""
    offset = (page - 1) * page_size
    items, total = list_scrutiny_queue(
        db=db,
        readiness_state=readiness_state,
        lifecycle_status=lifecycle_status,
        limit=page_size,
        offset=offset,
    )
    return PaginatedResponse(
        data=items,
        meta=MetaPagination(page=page, page_size=page_size, total=total),
    )
