import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.scrutiny_job import ScrutinyJob
from app.models.user import User
from app.core.exceptions import (
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
)
from app.services.audit import record_audit_event
from app.services.workflow import start_or_resume_workflow, get_workflow_status


ACTIVE_JOB_STATUSES = {"QUEUED", "PROCESSING"}


def create_scrutiny_job(
    db: Session,
    application_id: str,
    actor_id: str,
    job_type: str = "FULL_SCRUTINY",
) -> ScrutinyJob:
    """Create a persistent scrutiny job for an application with duplicate-trigger prevention."""
    app = db.get(Application, application_id)
    if not app:
        raise NotFoundException("APPLICATION_NOT_FOUND", f"Application '{application_id}' not found.")

    if app.lifecycle_status in ("ARCHIVED", "CANCELLED"):
        raise ConflictException(
            "APPLICATION_LOCKED",
            f"Application '{application_id}' is {app.lifecycle_status} and cannot be scrutinized."
        )

    # 1. Prevent duplicate active jobs
    active_job = db.scalar(
        select(ScrutinyJob).where(
            ScrutinyJob.application_id == application_id,
            ScrutinyJob.status.in_(ACTIVE_JOB_STATUSES)
        )
    )
    if active_job:
        raise ConflictException(
            "SCRUTINY_JOB_ALREADY_ACTIVE",
            f"Scrutiny job '{active_job.id}' is currently active ({active_job.status}) for application '{application_id}'."
        )

    # 2. Transition lifecycle if currently SUBMITTED
    if app.lifecycle_status == "SUBMITTED":
        app.lifecycle_status = "UNDER_SCRUTINY"
        if not app.assigned_reviewer_id:
            app.assigned_reviewer_id = actor_id
        app.updated_at = datetime.now(timezone.utc)

    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    job = ScrutinyJob(
        id=job_id,
        application_id=application_id,
        job_type=job_type,
        status="QUEUED",
        triggered_by=actor_id,
        retry_count=0,
        max_retries=2,
    )
    db.add(job)

    record_audit_event(
        db=db,
        event_type="SCRUTINY_JOB_CREATED",
        actor_id=actor_id,
        actor_type="USER",
        application_id=application_id,
        entity_type="SCRUTINY_JOB",
        entity_id=job.id,
        metadata={"job_type": job_type, "lifecycle_status": app.lifecycle_status},
    )

    db.commit()
    db.refresh(job)
    return job


def execute_scrutiny_job(db: Session, job_id: str) -> ScrutinyJob:
    """Execute a queued scrutiny job by invoking the authoritative VerityAI AI scrutiny pipeline."""
    job = db.get(ScrutinyJob, job_id)
    if not job:
        raise NotFoundException("SCRUTINY_JOB_NOT_FOUND", f"Scrutiny job '{job_id}' not found.")

    if job.status not in ("QUEUED", "PROCESSING"):
        raise ConflictException(
            "INVALID_JOB_STATE",
            f"Job '{job_id}' is in '{job.status}' state and cannot be executed."
        )

    job.status = "PROCESSING"
    job.started_at = datetime.now(timezone.utc)
    db.commit()

    start_time = datetime.now(timezone.utc)
    try:
        # Invokes the protected, authoritative VerityAI pipeline
        # (deterministic validation + RapidOCR/PyMuPDF extraction + AI anomaly detection)
        wf_res = start_or_resume_workflow(
            db=db,
            application_id=job.application_id,
            actor_id=job.triggered_by
        )

        completed_time = datetime.now(timezone.utc)
        duration_ms = int((completed_time - start_time).total_seconds() * 1000)

        job.status = "COMPLETED"
        job.completed_at = completed_time
        job.duration_ms = duration_ms
        job.stage_details = {k: v.model_dump() for k, v in wf_res.stages.items()}
        job.results_summary = {
            "pipeline_status": wf_res.pipeline_status,
            "lifecycle_status": wf_res.lifecycle_status,
        }

        record_audit_event(
            db=db,
            event_type="SCRUTINY_JOB_COMPLETED",
            actor_id=job.triggered_by,
            actor_type="USER",
            application_id=job.application_id,
            entity_type="SCRUTINY_JOB",
            entity_id=job.id,
            metadata={
                "duration_ms": duration_ms,
                "pipeline_status": wf_res.pipeline_status,
            },
        )
        db.commit()
        db.refresh(job)
        return job

    except Exception as exc:
        db.rollback()
        # Retrieve fresh job object after rollback
        failed_job = db.get(ScrutinyJob, job_id)
        if failed_job:
            failed_job.status = "FAILED"
            failed_job.completed_at = datetime.now(timezone.utc)
            failed_job.duration_ms = int((failed_job.completed_at - start_time).total_seconds() * 1000)
            failed_job.error_code = "PIPELINE_ERROR"
            failed_job.safe_error_summary = "An unexpected error occurred during scrutiny execution."

            record_audit_event(
                db=db,
                event_type="SCRUTINY_JOB_FAILED",
                actor_id=failed_job.triggered_by,
                actor_type="USER",
                application_id=failed_job.application_id,
                entity_type="SCRUTINY_JOB",
                entity_id=failed_job.id,
                metadata={"error": str(exc)[:200]},
            )
            db.commit()
            db.refresh(failed_job)
            return failed_job
        raise exc


def retry_scrutiny_job(db: Session, job_id: str, actor_id: str) -> ScrutinyJob:
    """Retry a failed scrutiny job within configured retry quota."""
    job = db.get(ScrutinyJob, job_id)
    if not job:
        raise NotFoundException("SCRUTINY_JOB_NOT_FOUND", f"Scrutiny job '{job_id}' not found.")

    if job.status != "FAILED":
        raise BadRequestException(
            code="INVALID_JOB_STATE",
            message=f"Only FAILED jobs can be retried. Current status is '{job.status}'."
        )

    if job.retry_count >= job.max_retries:
        raise BadRequestException(
            code="MAX_RETRIES_EXCEEDED",
            message=f"Scrutiny job '{job_id}' has reached maximum retry attempts ({job.max_retries})."
        )

    job.retry_count += 1
    job.status = "QUEUED"
    job.error_code = None
    job.safe_error_summary = None
    job.completed_at = None
    job.updated_at = datetime.now(timezone.utc)

    record_audit_event(
        db=db,
        event_type="SCRUTINY_JOB_RETRIED",
        actor_id=actor_id,
        actor_type="USER",
        application_id=job.application_id,
        entity_type="SCRUTINY_JOB",
        entity_id=job.id,
        metadata={"retry_count": job.retry_count, "max_retries": job.max_retries},
    )

    db.commit()
    db.refresh(job)
    return job


def get_scrutiny_job_by_id(db: Session, job_id: str, current_user: Optional[User] = None) -> ScrutinyJob:
    """Retrieve scrutiny job details with role and tenant protection."""
    job = db.get(ScrutinyJob, job_id)
    if not job:
        raise NotFoundException("SCRUTINY_JOB_NOT_FOUND", f"Scrutiny job '{job_id}' not found.")

    if current_user and current_user.role == "INSTITUTION_USER":
        raise ForbiddenException("FORBIDDEN", "Access to internal scrutiny jobs is restricted to regulatory officers.")

    return job


def list_application_scrutiny_jobs(
    db: Session, application_id: str, current_user: Optional[User] = None
) -> List[ScrutinyJob]:
    """List all scrutiny jobs for an application with role and tenant protection."""
    app = db.get(Application, application_id)
    if not app:
        raise NotFoundException("APPLICATION_NOT_FOUND", f"Application '{application_id}' not found.")

    if current_user and current_user.role == "INSTITUTION_USER":
        raise ForbiddenException("FORBIDDEN", "Access to internal scrutiny jobs is restricted to regulatory officers.")

    stmt = select(ScrutinyJob).where(ScrutinyJob.application_id == application_id).order_by(desc(ScrutinyJob.created_at))
    return list(db.scalars(stmt).all())


def reconcile_abandoned_scrutiny_jobs(db: Session) -> int:
    """Detect persisted jobs left in PROCESSING status after server interruption or restart,
    and safely transition them to FAILED with sanitized error summary and audit logging.
    Preserves job record, timestamps, and allows retry within configured limits.
    """
    abandoned_jobs = list(
        db.scalars(
            select(ScrutinyJob).where(ScrutinyJob.status == "PROCESSING")
        ).all()
    )
    count = len(abandoned_jobs)
    if count == 0:
        return 0

    now = datetime.now(timezone.utc)
    for job in abandoned_jobs:
        job.status = "FAILED"
        job.completed_at = now
        job.error_code = "SERVER_RESTARTED_DURING_EXECUTION"
        job.safe_error_summary = (
            "Scrutiny execution was interrupted by a server restart or shutdown. "
            "Please retry the scrutiny job."
        )
        record_audit_event(
            db=db,
            event_type="SCRUTINY_JOB_RECONCILED",
            actor_id="SYSTEM",
            actor_type="SYSTEM",
            application_id=job.application_id,
            entity_type="SCRUTINY_JOB",
            entity_id=job.id,
            metadata={
                "reason": "ABANDONED_ON_SERVER_STARTUP",
                "previous_status": "PROCESSING",
                "error_code": job.error_code,
            },
        )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger("verityai").error("Failed to commit scrutiny job reconciliation: %s", e)
        return 0

    return count

