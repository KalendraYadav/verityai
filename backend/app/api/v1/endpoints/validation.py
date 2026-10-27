from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.application import Application
from app.models.validation import ValidationRule, ValidationRun, RuleResult
from app.schemas.common import DataResponse
from app.schemas.validation import (
    ValidationRuleResponse,
    RuleResultResponse,
    ValidationSummaryResponse,
    ValidationTriggerRequest,
)
from app.core.exceptions import NotFoundException, ForbiddenException
from app.services.validation import run_application_validation, ensure_default_rules
from app.api.deps import require_roles, get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/validation-rules",
    response_model=DataResponse[List[ValidationRuleResponse]],
    summary="List all validation rules",
)
def list_validation_rules(
    rule_type: Optional[str] = Query(None, description="Filter by rule type"),
    category: Optional[str] = Query(None, description="Filter by category"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    db: Session = Depends(get_db),
):
    """List configurable deterministic validation rules."""
    ensure_default_rules(db)

    stmt = select(ValidationRule)
    if rule_type:
        stmt = stmt.where(ValidationRule.rule_type == rule_type)
    if category:
        stmt = stmt.where(ValidationRule.category == category)
    if enabled is not None:
        stmt = stmt.where(ValidationRule.enabled == enabled)

    stmt = stmt.order_by(ValidationRule.rule_code.asc())
    rules = list(db.scalars(stmt).all())
    return DataResponse(data=[ValidationRuleResponse.model_validate(r) for r in rules])


@router.post(
    "/applications/{application_id}/validate",
    response_model=DataResponse[ValidationSummaryResponse],
    status_code=status.HTTP_200_OK,
    summary="Trigger deterministic validation for an application",
)
def trigger_validation(
    application_id: str,
    payload: Optional[ValidationTriggerRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """Trigger the deterministic validation engine for an application."""
    app = db.scalar(select(Application).where(Application.id == application_id))
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    eval_date = payload.evaluation_date if payload else None
    result = run_application_validation(
        application_id=application_id,
        db=db,
        evaluation_date=eval_date,
        trigger="MANUAL",
    )

    summary_resp = ValidationSummaryResponse(
        application_id=result["application_id"],
        validation_run_id=result["validation_run_id"],
        status=result["status"],
        evaluation_date=result["evaluation_date"],
        pipeline_version=result["pipeline_version"],
        total_rules=result["total_rules"],
        passed=result["passed"],
        failed=result["failed"],
        needs_review=result["needs_review"],
        not_applicable=result["not_applicable"],
        unable_to_evaluate=result["unable_to_evaluate"],
        is_compliant=result["is_compliant"],
        evaluated_at=result["evaluated_at"],
        results=[RuleResultResponse.model_validate(r) for r in result["results"]],
    )
    return DataResponse(data=summary_resp)


@router.get(
    "/applications/{application_id}/validation-summary",
    response_model=DataResponse[ValidationSummaryResponse],
    summary="Get validation summary for an application",
)
def get_validation_summary(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the latest validation summary and rule results for an application."""
    app = db.scalar(select(Application).where(Application.id == application_id))
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    if current_user.role == "INSTITUTION_USER":
        if app.institution_id != current_user.institution_id:
            raise ForbiddenException(code="FORBIDDEN", message="Access to validation summary from another institution is denied.")
    elif current_user.role not in ("ADMIN", "REVIEWER"):
        raise ForbiddenException(code="FORBIDDEN", message=f"Role '{current_user.role}' is not authorized to access validation summary.")

    # Find current run
    current_run = db.scalar(
        select(ValidationRun)
        .where(ValidationRun.application_id == application_id, ValidationRun.is_current.is_(True))
        .order_by(desc(ValidationRun.started_at))
    )

    if not current_run:
        return DataResponse(
            data=ValidationSummaryResponse(
                application_id=application_id,
                status="NO_RUN",
                total_rules=0,
                passed=0,
                failed=0,
                needs_review=0,
                not_applicable=0,
                unable_to_evaluate=0,
                is_compliant=False,
                results=[],
            )
        )

    results = list(
        db.scalars(
            select(RuleResult)
            .where(RuleResult.validation_run_id == current_run.id)
            .order_by(RuleResult.rule_code.asc())
        ).all()
    )

    summary_dict = current_run.summary or {}
    return DataResponse(
        data=ValidationSummaryResponse(
            application_id=application_id,
            validation_run_id=current_run.id,
            status=current_run.status,
            evaluation_date=current_run.evaluation_date,
            pipeline_version=current_run.pipeline_version,
            total_rules=summary_dict.get("total_rules", len(results)),
            passed=summary_dict.get("passed", 0),
            failed=summary_dict.get("failed", 0),
            needs_review=summary_dict.get("needs_review", 0),
            not_applicable=summary_dict.get("not_applicable", 0),
            unable_to_evaluate=summary_dict.get("unable_to_evaluate", 0),
            is_compliant=summary_dict.get("is_compliant", False),
            evaluated_at=current_run.completed_at,
            results=[RuleResultResponse.model_validate(r) for r in results],
        )
    )


@router.get(
    "/applications/{application_id}/validation-results",
    response_model=DataResponse[List[RuleResultResponse]],
    summary="Get rule results for an application",
)
def get_validation_results(
    application_id: str,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by result status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve rule results for an application from the current validation run."""
    app = db.scalar(select(Application).where(Application.id == application_id))
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    if current_user.role == "INSTITUTION_USER":
        if app.institution_id != current_user.institution_id:
            raise ForbiddenException(code="FORBIDDEN", message="Access to validation results from another institution is denied.")
    elif current_user.role not in ("ADMIN", "REVIEWER"):
        raise ForbiddenException(code="FORBIDDEN", message=f"Role '{current_user.role}' is not authorized to access validation results.")


    current_run = db.scalar(
        select(ValidationRun)
        .where(ValidationRun.application_id == application_id, ValidationRun.is_current.is_(True))
        .order_by(desc(ValidationRun.started_at))
    )

    if not current_run:
        return DataResponse(data=[])

    stmt = select(RuleResult).where(RuleResult.validation_run_id == current_run.id)
    if status_filter:
        stmt = stmt.where(RuleResult.status == status_filter.upper())

    stmt = stmt.order_by(RuleResult.rule_code.asc())
    results = list(db.scalars(stmt).all())
    return DataResponse(data=[RuleResultResponse.model_validate(r) for r in results])


@router.get(
    "/validation-results/{result_id}",
    response_model=DataResponse[RuleResultResponse],
    summary="Get single rule result by ID",
)
def get_validation_result_detail(
    result_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve detailed validation result by ID with evidence payload."""
    result = db.scalar(select(RuleResult).where(RuleResult.id == result_id))
    if not result:
        raise NotFoundException(code="RESULT_NOT_FOUND", message=f"Validation result '{result_id}' not found.")

    return DataResponse(data=RuleResultResponse.model_validate(result))
