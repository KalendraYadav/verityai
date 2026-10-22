import os
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.application import Application
from app.models.report import ScrutinyReport
from app.models.audit import AuditEvent
from app.models.user import User
from app.schemas.report import (
    ReviewSummaryResponse,
    EvidenceTraceItem,
    ScrutinyReportResponse,
    ReportGenerationRequest,
)
from app.services.reporting import (
    get_application_review_summary,
    get_application_evidence_trace,
    generate_scrutiny_pdf,
    generate_scrutiny_json,
)
from app.api.deps import get_current_user_optional, get_current_user

router = APIRouter()


@router.get("/applications/{application_id}/review-summary", response_model=ReviewSummaryResponse)
def get_review_summary(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Get explainable decision support review summary for an application.
    """
    summary = get_application_review_summary(db, application_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application {application_id} not found",
        )
    return summary


@router.get("/applications/{application_id}/evidence", response_model=List[EvidenceTraceItem])
def get_evidence_trace(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Get itemized evidence trace items for an application.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application {application_id} not found",
        )
    return get_application_evidence_trace(db, application_id)


@router.post("/applications/{application_id}/reports", response_model=ScrutinyReportResponse)
def create_scrutiny_report(
    application_id: str,
    request: ReportGenerationRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Generate a new regulatory scrutiny report (PDF or JSON).
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application {application_id} not found",
        )

    actor_id = current_user.id if current_user else None
    fmt = request.format.upper()

    try:
        if fmt == "JSON":
            report = generate_scrutiny_json(db, application_id, actor_id)
        else:
            report = generate_scrutiny_pdf(db, application_id, actor_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate scrutiny report: {str(e)}",
        )

    return report


@router.get("/applications/{application_id}/reports", response_model=List[ScrutinyReportResponse])
def list_application_reports(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    List all generated scrutiny reports for an application.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application {application_id} not found",
        )

    reports = (
        db.query(ScrutinyReport)
        .filter(ScrutinyReport.application_id == application_id)
        .order_by(ScrutinyReport.created_at.desc())
        .all()
    )
    return reports


@router.get("/reports/{report_id}/download")
def download_scrutiny_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Safely download a generated scrutiny report file with security headers.
    """
    report = db.query(ScrutinyReport).filter(ScrutinyReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report {report_id} not found",
        )

    file_path = report.storage_path
    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report artifact file not found on disk",
        )

    # Audit download event
    actor_id = current_user.id if current_user else None
    audit_evt = AuditEvent(
        id=str(uuid.uuid4()),
        application_id=report.application_id,
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        event_type="REPORT_DOWNLOADED",
        metadata_json={"report_id": report.id, "format": report.format},
    )
    db.add(audit_evt)
    db.commit()

    media_type = "application/pdf" if report.format == "PDF" else "application/json"
    filename = f"verityai_scrutiny_dossier_{report.application_id[:8]}.{report.format.lower()}"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
    }

    return FileResponse(path=file_path, media_type=media_type, headers=headers)
