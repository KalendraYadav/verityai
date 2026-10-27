from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.scrutiny_job import (
    ScrutinyJobCreate,
    ScrutinyJobResponse,
    ScrutinyJobListItem,
)
from app.api.deps import require_roles
from app.services.scrutiny_job import (
    create_scrutiny_job,
    execute_scrutiny_job,
    retry_scrutiny_job,
    get_scrutiny_job_by_id,
    list_application_scrutiny_jobs,
)

router = APIRouter()


def _run_background_scrutiny(job_id: str):
    """Execute scrutiny job in background task with dedicated database session."""
    worker_db = SessionLocal()
    try:
        execute_scrutiny_job(db=worker_db, job_id=job_id)
    finally:
        worker_db.close()


@router.post(
    "/applications/{application_id}/scrutiny-jobs",
    response_model=DataResponse[ScrutinyJobResponse],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger persistent VerityAI scrutiny job for an application",
)
def trigger_application_scrutiny_job(
    application_id: str,
    background_tasks: BackgroundTasks,
    payload: Optional[ScrutinyJobCreate] = None,
    run_async: bool = Query(False, description="Whether to execute pipeline asynchronously in background"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """Create and immediately execute or queue an orchestrated scrutiny job against an application.
    Enforces duplicate-trigger prevention and records immutable audit events.
    """
    job_type = payload.job_type if payload else "FULL_SCRUTINY"
    job = create_scrutiny_job(
        db=db,
        application_id=application_id,
        actor_id=current_user.id,
        job_type=job_type,
    )
    if run_async:
        background_tasks.add_task(_run_background_scrutiny, job.id)
        return DataResponse(data=ScrutinyJobResponse.model_validate(job))

    # Synchronous execution
    executed_job = execute_scrutiny_job(db=db, job_id=job.id)
    return DataResponse(data=ScrutinyJobResponse.model_validate(executed_job))


@router.get(
    "/scrutiny-jobs/{job_id}",
    response_model=DataResponse[ScrutinyJobResponse],
    summary="Get scrutiny job status and stage progress",
)
def get_scrutiny_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """Retrieve details and stage progression for a specific scrutiny job."""
    job = get_scrutiny_job_by_id(db=db, job_id=job_id, current_user=current_user)
    return DataResponse(data=ScrutinyJobResponse.model_validate(job))


@router.get(
    "/applications/{application_id}/scrutiny-jobs",
    response_model=DataResponse[List[ScrutinyJobListItem]],
    summary="List all scrutiny jobs for an application",
)
def list_scrutiny_jobs(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """List historical and active scrutiny jobs for an application."""
    jobs = list_application_scrutiny_jobs(db=db, application_id=application_id, current_user=current_user)
    return DataResponse(data=[ScrutinyJobListItem.model_validate(j) for j in jobs])


@router.post(
    "/scrutiny-jobs/{job_id}/retry",
    response_model=DataResponse[ScrutinyJobResponse],
    summary="Retry a failed scrutiny job within retry quota",
)
def retry_failed_scrutiny_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    run_async: bool = Query(False, description="Whether to execute retry asynchronously in background"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """Retry a failed scrutiny job. Enforces maximum retry limits and safe error state reset."""
    retried_job = retry_scrutiny_job(db=db, job_id=job_id, actor_id=current_user.id)
    if run_async:
        background_tasks.add_task(_run_background_scrutiny, retried_job.id)
        return DataResponse(data=ScrutinyJobResponse.model_validate(retried_job))

    executed_job = execute_scrutiny_job(db=db, job_id=retried_job.id)
    return DataResponse(data=ScrutinyJobResponse.model_validate(executed_job))


@router.post(
    "/applications/{application_id}/run-verity-scrutiny",
    response_model=DataResponse[Dict[str, Any]],
    summary="Portal Action: Invoke independent VerityAI scrutiny via Server-Side API Client",
)
def run_verity_scrutiny_for_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """
    Executes VerityAI document scrutiny through the server-side integration client,
    proving decoupling from the institutional portal.
    """
    from app.services.verity_client import trigger_portal_application_scrutiny
    job = trigger_portal_application_scrutiny(db=db, application_id=application_id, actor_id=current_user.id)
    return DataResponse(
        data={
            "job_id": job.id,
            "client_id": job.client_id,
            "external_reference": job.external_reference,
            "status": job.status,
            "stage": job.stage,
            "duration_ms": job.duration_ms,
            "summary": job.summary,
            "findings": job.findings,
            "rule_results": job.rule_results,
            "completed_at": job.completed_at,
            "report_path": job.report_path,
        }
    )


@router.get(
    "/applications/{application_id}/verity-scrutiny-status",
    response_model=DataResponse[Optional[Dict[str, Any]]],
    summary="Get latest VerityAI integration scrutiny status for an application",
)
def get_application_verity_scrutiny_status(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("REVIEWER", "ADMIN")),
):
    """Retrieve the latest integration scrutiny job results for an application."""
    from app.models.integration_job import IntegrationScrutinyJob
    job = db.scalar(
        select(IntegrationScrutinyJob)
        .where(IntegrationScrutinyJob.internal_application_id == application_id)
        .order_by(desc(IntegrationScrutinyJob.created_at))
    )
    if not job:
        return DataResponse(data=None)

    return DataResponse(
        data={
            "job_id": job.id,
            "client_id": job.client_id,
            "external_reference": job.external_reference,
            "status": job.status,
            "stage": job.stage,
            "duration_ms": job.duration_ms,
            "summary": job.summary,
            "findings": job.findings,
            "rule_results": job.rule_results,
            "completed_at": job.completed_at,
            "report_path": job.report_path,
        }
    )
