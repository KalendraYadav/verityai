from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.document import Document
from app.models.validation import ValidationRun, RuleResult
from app.models.finding import Finding
from app.models.category import ApplicationCategory
from app.models.institution import Institution
from app.schemas.workflow import (
    StageDetail,
    WorkflowStatusResponse,
    ApplicationReadinessResponse,
    DocumentReadiness,
    ProcessingReadiness,
    ValidationReadiness,
    AnomalyReadiness,
    ScrutinyQueueItem,
)
from app.services.validation import run_application_validation
from app.services.anomaly import run_application_analysis
from app.services.audit import record_audit_event


VALID_LIFECYCLE_STATES = {
    "DRAFT",
    "SUBMITTED",
    "UNDER_SCRUTINY",
    "ACTION_REQUIRED",
    "SCRUTINY_COMPLETED",
}

PERMITTED_TRANSITIONS: Dict[str, List[str]] = {
    "DRAFT": ["SUBMITTED"],
    "SUBMITTED": ["UNDER_SCRUTINY", "DRAFT"],
    "UNDER_SCRUTINY": ["ACTION_REQUIRED", "SCRUTINY_COMPLETED"],
    "ACTION_REQUIRED": ["SUBMITTED", "UNDER_SCRUTINY"],
    "SCRUTINY_COMPLETED": ["UNDER_SCRUTINY"],  # Authorized reopening only
}


def get_application_readiness(db: Session, application_id: str) -> ApplicationReadinessResponse:
    """Calculate multi-dimensional application readiness across documents, extraction,
    deterministic validation, and anomaly findings from actual persisted database records.
    Never collapses dimensions into an unexplained artificial percentage.
    """
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    category = db.get(ApplicationCategory, app.category_code)
    required_types = category.required_document_types if category else []

    # 1. Document Readiness
    docs = list(db.scalars(select(Document).where(Document.application_id == application_id)).all())
    uploaded_types = {d.effective_type or d.declared_type for d in docs if (d.effective_type or d.declared_type)}
    missing_types = [t for t in required_types if t not in uploaded_types]
    doc_complete = len(missing_types) == 0

    doc_readiness = DocumentReadiness(
        complete=doc_complete,
        uploaded_count=len(docs),
        required_count=len(required_types),
        missing_types=missing_types,
    )

    # 2. Processing Readiness
    processed_count = sum(1 for d in docs if d.processing_status in ("EXTRACTED", "OCR_SUCCESS", "FALLBACK_OCR_SUCCESS"))
    pending_count = sum(1 for d in docs if d.processing_status in ("PENDING", "PROCESSING", "SUBMITTED"))
    failed_count = sum(1 for d in docs if d.processing_status in ("FAILED", "CORRUPTED", "ERROR"))
    proc_complete = len(docs) > 0 and pending_count == 0 and failed_count == 0

    proc_readiness = ProcessingReadiness(
        complete=proc_complete,
        total_documents=len(docs),
        processed_count=processed_count,
        pending_count=pending_count,
        failed_count=failed_count,
    )

    # 3. Validation Readiness
    latest_run = db.scalar(
        select(ValidationRun)
        .where(ValidationRun.application_id == application_id)
        .order_by(desc(ValidationRun.started_at))
    )
    if latest_run:
        results = list(db.scalars(select(RuleResult).where(RuleResult.validation_run_id == latest_run.id)).all())
        passed_count = sum(1 for r in results if r.status == "PASS")
        failed_count = sum(1 for r in results if r.status == "FAIL")
        needs_review_count = sum(1 for r in results if r.status == "NEEDS_REVIEW")
        unable_count = sum(1 for r in results if r.status == "UNABLE_TO_EVALUATE")
        val_evaluated = True
    else:
        passed_count = 0
        failed_count = 0
        needs_review_count = 0
        unable_count = 0
        val_evaluated = False

    val_readiness = ValidationReadiness(
        evaluated=val_evaluated,
        passed_count=passed_count,
        failed_count=failed_count,
        needs_review_count=needs_review_count,
        unable_to_evaluate_count=unable_count,
    )

    # 4. Anomaly Readiness
    findings = list(
        db.scalars(select(Finding).where(Finding.application_id == application_id, Finding.is_current.is_(True))).all()
    )
    open_findings = sum(1 for f in findings if f.review_status == "OPEN")
    confirmed_findings = sum(1 for f in findings if f.review_status == "CONFIRMED")
    dismissed_findings = sum(1 for f in findings if f.review_status == "DISMISSED")
    resolved_findings = sum(1 for f in findings if f.review_status == "RESOLVED")

    anomaly_readiness = AnomalyReadiness(
        analyzed=len(findings) > 0 or latest_run is not None,
        total_findings=len(findings),
        open_findings=open_findings,
        confirmed_findings=confirmed_findings,
        dismissed_findings=dismissed_findings,
        resolved_findings=resolved_findings,
    )

    # 5. Compile Blockers and Final Readiness State
    blockers: List[str] = []
    if missing_types:
        blockers.append(f"Missing mandatory supporting documents: {', '.join(missing_types)}")
    if pending_count > 0:
        blockers.append(f"{pending_count} document(s) currently being processed for text extraction")
    if failed_count > 0:
        blockers.append(f"{failed_count} document(s) failed text extraction and require re-upload or inspection")
    if not val_evaluated:
        blockers.append("Deterministic regulatory validation has not yet been executed")
    if failed_count > 0:
        blockers.append(f"{failed_count} statutory validation rule failure(s) recorded")
    if open_findings > 0:
        blockers.append(f"{open_findings} discrepancy finding(s) require human reviewer examination")

    if app.lifecycle_status == "SCRUTINY_COMPLETED":
        readiness_state = "SCRUTINY_COMPLETED"
        is_ready = False
        action = "Scrutiny completed by regulatory reviewer. No further automated actions pending."
    elif app.lifecycle_status == "ACTION_REQUIRED":
        readiness_state = "ACTION_REQUIRED"
        is_ready = False
        action = "Awaiting supplementary institutional documents or clarifications from applicant."
    elif not doc_complete:
        readiness_state = "DOCUMENTS_PENDING"
        is_ready = False
        action = "Upload missing mandatory documents before proceeding to scrutiny."
    elif pending_count > 0:
        readiness_state = "EXTRACTION_IN_PROGRESS"
        is_ready = False
        action = "Allow background text extraction & OCR to finish."
    elif not val_evaluated:
        readiness_state = "VALIDATION_REQUIRED"
        is_ready = False
        action = "Execute deterministic validation engine to evaluate statutory rules."
    else:
        readiness_state = "READY_FOR_SCRUTINY"
        is_ready = True
        action = "Ready for human regulatory review and finding adjudication."

    return ApplicationReadinessResponse(
        application_id=app.id,
        is_ready_for_scrutiny=is_ready,
        readiness_state=readiness_state,
        document_readiness=doc_readiness,
        processing_readiness=proc_readiness,
        validation_readiness=val_readiness,
        anomaly_readiness=anomaly_readiness,
        blockers=blockers,
        recommended_action=action,
    )


def get_workflow_status(db: Session, application_id: str) -> WorkflowStatusResponse:
    """Retrieve structured workflow stage progression for an application."""
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    readiness = get_application_readiness(db, application_id)

    stages = {
        "documents": StageDetail(
            status="COMPLETE" if readiness.document_readiness.complete else "PENDING",
            summary=f"{readiness.document_readiness.uploaded_count}/{readiness.document_readiness.required_count} required documents present",
            metadata={"missing_types": readiness.document_readiness.missing_types},
        ),
        "extraction": StageDetail(
            status="COMPLETE" if readiness.processing_readiness.complete else (
                "IN_PROGRESS" if readiness.processing_readiness.pending_count > 0 else "PARTIAL"
            ),
            summary=f"{readiness.processing_readiness.processed_count} processed, {readiness.processing_readiness.failed_count} failed",
            metadata={
                "pending": readiness.processing_readiness.pending_count,
                "failed": readiness.processing_readiness.failed_count,
            },
        ),
        "validation": StageDetail(
            status="COMPLETE" if readiness.validation_readiness.evaluated else "NOT_STARTED",
            summary=f"{readiness.validation_readiness.passed_count} passed, {readiness.validation_readiness.failed_count} failed, {readiness.validation_readiness.needs_review_count} review required",
            metadata={
                "evaluated": readiness.validation_readiness.evaluated,
                "failures": readiness.validation_readiness.failed_count,
            },
        ),
        "anomalies": StageDetail(
            status="COMPLETE" if readiness.anomaly_readiness.analyzed else "NOT_STARTED",
            summary=f"{readiness.anomaly_readiness.total_findings} findings discovered ({readiness.anomaly_readiness.open_findings} open)",
            metadata={
                "open": readiness.anomaly_readiness.open_findings,
                "confirmed": readiness.anomaly_readiness.confirmed_findings,
            },
        ),
        "decision": StageDetail(
            status="COMPLETE" if app.lifecycle_status == "SCRUTINY_COMPLETED" else (
                "UNDER_REVIEW" if app.lifecycle_status == "UNDER_SCRUTINY" else "PENDING"
            ),
            summary=f"Lifecycle: {app.lifecycle_status}",
            metadata={"assigned_reviewer_id": app.assigned_reviewer_id},
        ),
    }

    return WorkflowStatusResponse(
        application_id=app.id,
        application_reference=app.application_reference,
        lifecycle_status=app.lifecycle_status,
        pipeline_status=app.pipeline_status,
        submitted_at=app.submitted_at,
        assigned_reviewer_id=app.assigned_reviewer_id,
        stages=stages,
        last_updated_at=app.updated_at,
    )


def transition_application_state(
    db: Session,
    application_id: str,
    target_status: str,
    actor_id: Optional[str] = None,
    reason: Optional[str] = None,
    reviewer_notes: Optional[str] = None,
) -> Application:
    """Validate and execute application lifecycle state transitions."""
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    target_status_upper = target_status.upper().strip()
    if target_status_upper not in VALID_LIFECYCLE_STATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_STATE",
                "message": f"'{target_status}' is not a valid lifecycle state. Allowed: {sorted(list(VALID_LIFECYCLE_STATES))}",
            },
        )

    current_status = app.lifecycle_status
    if target_status_upper == current_status:
        # Idempotent no-op
        return app

    allowed = PERMITTED_TRANSITIONS.get(current_status, [])
    if target_status_upper not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_STATE_TRANSITION",
                "message": f"Transition from '{current_status}' to '{target_status_upper}' is disallowed. Allowed: {allowed}",
            },
        )

    # Transition side-effects
    if target_status_upper == "SUBMITTED":
        app.submitted_at = datetime.now(timezone.utc)
    elif target_status_upper == "UNDER_SCRUTINY" and actor_id and not app.assigned_reviewer_id:
        app.assigned_reviewer_id = actor_id

    old_status = app.lifecycle_status
    app.lifecycle_status = target_status_upper
    app.updated_at = datetime.now(timezone.utc)

    record_audit_event(
        db=db,
        event_type="APPLICATION_STATUS_TRANSITION",
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        application_id=app.id,
        entity_type="application",
        entity_id=app.id,
        metadata={
            "old_status": old_status,
            "new_status": target_status_upper,
            "reason": reason,
            "reviewer_notes": reviewer_notes,
        },
    )
    db.commit()
    db.refresh(app)
    return app


def start_or_resume_workflow(
    db: Session,
    application_id: str,
    actor_id: Optional[str] = None,
) -> WorkflowStatusResponse:
    """Orchestrate the end-to-end scrutiny pipeline for an application:
    1. Assess document uploads and text extraction.
    2. Execute deterministic validation engine.
    3. Execute AI-assisted cross-document anomaly analysis.
    4. Transition pipeline_status and return comprehensive workflow status.
    """
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    record_audit_event(
        db=db,
        event_type="WORKFLOW_INITIATED",
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        application_id=app.id,
        metadata={"current_lifecycle": app.lifecycle_status},
    )

    app.pipeline_status = "PROCESSING"
    db.commit()

    # Step 1: Run deterministic validation
    val_summary = run_application_validation(application_id=application_id, db=db, triggered_by=actor_id)

    # Step 2: Run AI-assisted anomaly detection
    analysis_res = run_application_analysis(db=db, application_id=application_id, actor_id=actor_id)

    # Step 3: Determine resulting pipeline status
    val_failed = val_summary.get("failed", 0)
    val_needs_review = val_summary.get("needs_review", 0)
    analysis_open = analysis_res.get("open_findings", 0)

    if val_failed > 0:
        app.pipeline_status = "VALIDATION_FAILED"
    elif val_needs_review > 0 or analysis_open > 0:
        app.pipeline_status = "NEEDS_REVIEW"
    else:
        app.pipeline_status = "COMPLETED"

    # If application is DRAFT but now validated and ready, advance to SUBMITTED
    if app.lifecycle_status == "DRAFT":
        readiness = get_application_readiness(db, application_id)
        if readiness.document_readiness.complete:
            app.lifecycle_status = "SUBMITTED"
            app.submitted_at = datetime.now(timezone.utc)

    app.updated_at = datetime.now(timezone.utc)
    record_audit_event(
        db=db,
        event_type="WORKFLOW_COMPLETED",
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        application_id=app.id,
        metadata={
            "pipeline_status": app.pipeline_status,
            "validation_passed": val_summary.get("passed", 0),
            "validation_failed": val_failed,
            "anomalies_detected": analysis_res.get("total_anomalies", 0),
        },
    )
    db.commit()
    db.refresh(app)

    return get_workflow_status(db, application_id)


def list_scrutiny_queue(
    db: Session,
    readiness_state: Optional[str] = None,
    lifecycle_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[ScrutinyQueueItem], int]:
    """Retrieve prioritized list of applications currently in or awaiting scrutiny."""
    stmt = (
        select(Application, Institution.institution_name)
        .join(Institution, Application.institution_id == Institution.id)
        .order_by(desc(Application.updated_at))
    )

    if lifecycle_status:
        stmt = stmt.where(Application.lifecycle_status == lifecycle_status.upper())
    else:
        # Default scrutiny queue: submitted or under active scrutiny
        stmt = stmt.where(Application.lifecycle_status.in_(["SUBMITTED", "UNDER_SCRUTINY", "ACTION_REQUIRED"]))

    rows = db.execute(stmt).all()

    queue_items: List[ScrutinyQueueItem] = []
    for app_obj, inst_name in rows:
        readiness = get_application_readiness(db, app_obj.id)
        if readiness_state and readiness.readiness_state != readiness_state.upper():
            continue

        item = ScrutinyQueueItem(
            id=app_obj.id,
            application_reference=app_obj.application_reference,
            institution_id=app_obj.institution_id,
            institution_name=inst_name,
            category_code=app_obj.category_code,
            academic_year=app_obj.academic_year,
            lifecycle_status=app_obj.lifecycle_status,
            pipeline_status=app_obj.pipeline_status,
            readiness_state=readiness.readiness_state,
            blockers_count=len(readiness.blockers),
            open_findings_count=readiness.anomaly_readiness.open_findings,
            validation_failure_count=readiness.validation_readiness.failed_count,
            assigned_reviewer_id=app_obj.assigned_reviewer_id,
            submitted_at=app_obj.submitted_at,
            created_at=app_obj.created_at,
        )
        queue_items.append(item)

    total = len(queue_items)
    paged_items = queue_items[offset : offset + limit]
    return paged_items, total
