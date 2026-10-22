from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.application import Application
from app.models.finding import Finding, ExtractedField
from app.schemas.common import DataResponse
from app.schemas.finding import (
    FindingResponse,
    FindingReviewRequest,
    ApplicationAnalysisResponse,
    ExtractedFieldResponse,
)
from app.core.exceptions import NotFoundException, BadRequestException
from app.services.anomaly import run_application_analysis, review_finding

router = APIRouter()


@router.post(
    "/applications/{application_id}/analyze",
    response_model=DataResponse[ApplicationAnalysisResponse],
    status_code=status.HTTP_200_OK,
    summary="Trigger AI-assisted anomaly detection and candidate extraction for an application",
)
def trigger_analysis(
    application_id: str,
    db: Session = Depends(get_db),
):
    """Executes candidate field extraction, cross-document discrepancy checks,
    and anomaly detection for all uploaded documents of an application.
    """
    app = db.get(Application, application_id)
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    try:
        result = run_application_analysis(application_id=application_id, db=db, actor_id="SYSTEM")
    except ValueError as e:
        raise BadRequestException(code="ANALYSIS_FAILED", message=str(e))

    analysis_resp = ApplicationAnalysisResponse(
        application_id=result["application_id"],
        total_anomalies=result["total_anomalies"],
        open_findings=result["open_findings"],
        confirmed_findings=result["confirmed_findings"],
        dismissed_findings=result["dismissed_findings"],
        resolved_findings=result["resolved_findings"],
        severity_breakdown=result["severity_breakdown"],
        category_breakdown=result["category_breakdown"],
        ai_advisory_status=result["ai_advisory_status"],
        ai_advisory_message=result["ai_advisory_message"],
        findings=[FindingResponse.model_validate(f) for f in result["findings"]],
        extracted_fields=[ExtractedFieldResponse.model_validate(ef) for ef in result["extracted_fields"]],
    )
    return DataResponse(data=analysis_resp)


@router.get(
    "/applications/{application_id}/analysis",
    response_model=DataResponse[ApplicationAnalysisResponse],
    summary="Get application analysis overview, findings, and candidate fields",
)
def get_analysis_summary(
    application_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve the current analysis overview, active findings, and candidate fields."""
    app = db.get(Application, application_id)
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    findings = list(
        db.scalars(
            select(Finding)
            .where(
                and_(
                    Finding.application_id == application_id,
                    Finding.is_current.is_(True),
                )
            )
            .order_by(desc(Finding.created_at))
        ).all()
    )

    doc_ids = [d.id for d in app.documents if d.file_state != "DELETED"]
    extracted_fields: List[ExtractedField] = []
    if doc_ids:
        extracted_fields = list(
            db.scalars(
                select(ExtractedField)
                .where(
                    and_(
                        ExtractedField.document_id.in_(doc_ids),
                        ExtractedField.is_current.is_(True),
                    )
                )
                .order_by(ExtractedField.field_key.asc())
            ).all()
        )

    open_count = sum(1 for f in findings if f.review_status == "OPEN")
    confirmed_count = sum(1 for f in findings if f.review_status == "CONFIRMED")
    dismissed_count = sum(1 for f in findings if f.review_status == "DISMISSED")
    resolved_count = sum(1 for f in findings if f.review_status == "RESOLVED")

    sev_breakdown = {}
    for f in findings:
        sev_breakdown[f.severity] = sev_breakdown.get(f.severity, 0) + 1

    cat_breakdown = {}
    for f in findings:
        cat_breakdown[f.category] = cat_breakdown.get(f.category, 0) + 1

    resp = ApplicationAnalysisResponse(
        application_id=application_id,
        total_anomalies=len(findings),
        open_findings=open_count,
        confirmed_findings=confirmed_count,
        dismissed_findings=dismissed_count,
        resolved_findings=resolved_count,
        severity_breakdown=sev_breakdown,
        category_breakdown=cat_breakdown,
        ai_advisory_status="LOCAL_DETERMINISTIC_ACTIVE",
        ai_advisory_message="Deterministic cross-document and anomaly detection active. Optional cloud LLM disabled.",
        findings=[FindingResponse.model_validate(f) for f in findings],
        extracted_fields=[ExtractedFieldResponse.model_validate(ef) for ef in extracted_fields],
    )
    return DataResponse(data=resp)


@router.get(
    "/applications/{application_id}/anomalies",
    response_model=DataResponse[List[FindingResponse]],
    summary="List active findings and anomalies for an application",
)
def list_application_anomalies(
    application_id: str,
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    review_status: Optional[str] = Query(None, description="Filter by review status"),
    db: Session = Depends(get_db),
):
    """List current findings and anomalies for an application with optional filtering."""
    app = db.get(Application, application_id)
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    stmt = select(Finding).where(
        and_(
            Finding.application_id == application_id,
            Finding.is_current.is_(True),
        )
    )
    if severity:
        stmt = stmt.where(Finding.severity == severity.upper())
    if category:
        stmt = stmt.where(Finding.category == category.upper())
    if review_status:
        stmt = stmt.where(Finding.review_status == review_status.upper())

    stmt = stmt.order_by(desc(Finding.created_at))
    findings = list(db.scalars(stmt).all())
    return DataResponse(data=[FindingResponse.model_validate(f) for f in findings])


@router.get(
    "/anomalies/{finding_id}",
    response_model=DataResponse[FindingResponse],
    summary="Get single finding details with evidence chain",
)
def get_finding(
    finding_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve single finding with full evidence citations and snapshot data."""
    finding = db.get(Finding, finding_id)
    if not finding:
        raise NotFoundException(code="FINDING_NOT_FOUND", message=f"Finding '{finding_id}' not found.")

    return DataResponse(data=FindingResponse.model_validate(finding))


@router.post(
    "/anomalies/{finding_id}/review",
    response_model=DataResponse[FindingResponse],
    status_code=status.HTTP_200_OK,
    summary="Record reviewer action and verdict on a finding",
)
def review_anomaly_finding(
    finding_id: str,
    payload: FindingReviewRequest,
    db: Session = Depends(get_db),
):
    """Reviewers can mark findings as OPEN, UNDER_REVIEW, CONFIRMED, DISMISSED,
    RESOLVED, or AWAITING_EVIDENCE with an explanatory audit note.
    """
    try:
        updated = review_finding(
            finding_id=finding_id,
            review_status=payload.review_status.upper(),
            comment=payload.comment,
            reviewer_id=payload.reviewer_id,
            db=db,
        )
    except ValueError as e:
        msg = str(e)
        if "not found" in msg.lower():
            raise NotFoundException(code="FINDING_NOT_FOUND", message=msg)
        raise BadRequestException(code="INVALID_REVIEW_ACTION", message=msg)

    return DataResponse(data=FindingResponse.model_validate(updated))


@router.get(
    "/applications/{application_id}/extracted-fields",
    response_model=DataResponse[List[ExtractedFieldResponse]],
    summary="List candidate and extracted fields for an application's documents",
)
def list_extracted_fields(
    application_id: str,
    field_key: Optional[str] = Query(None, description="Filter by candidate field key"),
    document_id: Optional[str] = Query(None, description="Filter by specific document"),
    db: Session = Depends(get_db),
):
    """Retrieve normalized extracted candidate fields across documents with provenance."""
    app = db.get(Application, application_id)
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    doc_ids = [d.id for d in app.documents if d.file_state != "DELETED"]
    if not doc_ids:
        return DataResponse(data=[])

    stmt = select(ExtractedField).where(
        and_(
            ExtractedField.document_id.in_(doc_ids),
            ExtractedField.is_current.is_(True),
        )
    )
    if document_id:
        stmt = stmt.where(ExtractedField.document_id == document_id)
    if field_key:
        stmt = stmt.where(ExtractedField.field_key == field_key)

    stmt = stmt.order_by(ExtractedField.document_id.asc(), ExtractedField.field_key.asc())
    fields = list(db.scalars(stmt).all())
    return DataResponse(data=[ExtractedFieldResponse.model_validate(f) for f in fields])
