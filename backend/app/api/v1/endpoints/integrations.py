import json
import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import (
    APIRouter,
    Depends,
    status,
    UploadFile,
    File,
    Form,
    Header,
    Query,
    BackgroundTasks,
    HTTPException,
)
from fastapi.responses import FileResponse
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db, SessionLocal
from app.models.user import User
from app.models.integration_client import IntegrationClient
from app.models.integration_job import IntegrationScrutinyJob
from app.schemas.common import DataResponse
from app.schemas.integration_api import (
    IntegrationClientCreate,
    IntegrationClientCreatedResponse,
    IntegrationClientResponse,
    IntegrationJobResponse,
    IntegrationJobResultsResponse,
    IntegrationHealthResponse,
)
from app.api.deps import (
    require_roles,
    get_authenticated_api_client,
    require_client_scope,
)
from app.services.api_key import (
    create_api_client,
    rotate_api_client_secret,
    revoke_api_client,
)
from app.services.integration_scrutiny import (
    create_integration_job,
    execute_integration_job,
    get_authorized_integration_job,
)

router = APIRouter()


def _run_background_integration_scrutiny(job_id: str):
    """Background task executor for integration scrutiny jobs."""
    worker_db = SessionLocal()
    try:
        execute_integration_job(db=worker_db, job_id=job_id)
    finally:
        worker_db.close()


# ─── Service Health & Capabilities ──────────────────────────────────────────

@router.get(
    "/health",
    response_model=DataResponse[IntegrationHealthResponse],
    summary="VerityAI Gateway Service Health & Capabilities Probe",
)
def get_integration_health():
    """Discover VerityAI intelligence engine availability and capabilities."""
    return DataResponse(
        data=IntegrationHealthResponse(
            status="healthy",
            platform="VerityAI Independent Scrutiny Engine",
            version=settings.VERSION,
            capabilities=[
                "PDF_TEXT_EXTRACTION",
                "MULTI_ENGINE_OCR",
                "DETERMINISTIC_REGULATORY_VALIDATION",
                "CROSS_DOCUMENT_ANOMALY_DETECTION",
                "EVIDENCE_PROVENANCE_LINKAGE",
                "DECISION_SUPPORT_REPORT_GENERATION",
            ],
            ocr_engine="PyMuPDF / pdfplumber (Local Deterministic Fallback)",
            ai_provider_mode="Local Deterministic Heuristic Engine (Offline Active)",
            timestamp=datetime.now(timezone.utc),
        )
    )


# ─── API Client Management (Authorized Administrator Only) ─────────────────

@router.get(
    "/clients",
    response_model=DataResponse[List[IntegrationClientResponse]],
    summary="List registered external integration clients",
)
def list_api_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    """List all registered external integration clients. Secrets are never exposed."""
    clients = db.scalars(select(IntegrationClient).order_by(desc(IntegrationClient.created_at))).all()
    res = [
        IntegrationClientResponse(
            client_id=c.client_id,
            client_name=c.client_name,
            description=c.description,
            secret_prefix=c.secret_prefix,
            scopes=c.scopes,
            is_active=c.is_active,
            created_at=c.created_at,
            last_used_at=c.last_used_at,
            revoked_at=c.revoked_at,
        )
        for c in clients
    ]
    return DataResponse(data=res)


@router.post(
    "/clients",
    response_model=DataResponse[IntegrationClientCreatedResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new external integration API client",
)
def create_new_api_client(
    payload: IntegrationClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    """
    Generate new API credentials for an integrating client.
    The raw secret is revealed ONLY ONCE in this response.
    """
    client, raw_secret = create_api_client(
        db=db,
        client_name=payload.client_name,
        description=payload.description,
        scopes=payload.scopes,
        created_by=current_user.id,
    )
    return DataResponse(
        data=IntegrationClientCreatedResponse(
            client_id=client.client_id,
            client_name=client.client_name,
            description=client.description,
            client_secret=raw_secret,
            secret_prefix=client.secret_prefix,
            scopes=client.scopes,
            created_at=client.created_at,
        )
    )


@router.post(
    "/clients/{client_id}/rotate",
    response_model=DataResponse[IntegrationClientCreatedResponse],
    summary="Rotate an integration client's secret",
)
def rotate_client_secret(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    """Rotate credentials for an existing client. Returns the new plain secret once."""
    client, new_raw_secret = rotate_api_client_secret(db=db, client_id=client_id, actor_id=current_user.id)
    return DataResponse(
        data=IntegrationClientCreatedResponse(
            client_id=client.client_id,
            client_name=client.client_name,
            description=client.description,
            client_secret=new_raw_secret,
            secret_prefix=client.secret_prefix,
            scopes=client.scopes,
            created_at=client.created_at,
        )
    )


@router.delete(
    "/clients/{client_id}",
    response_model=DataResponse[Dict[str, Any]],
    summary="Revoke an integration client",
)
def revoke_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    """Revoke and deactivate client credentials immediately."""
    client = revoke_api_client(db=db, client_id=client_id, actor_id=current_user.id)
    return DataResponse(
        data={
            "client_id": client.client_id,
            "status": "REVOKED",
            "revoked_at": client.revoked_at,
        }
    )


# ─── Scrutiny Gateway (Authenticated External Clients) ─────────────────────

@router.post(
    "/scrutiny-jobs",
    response_model=DataResponse[IntegrationJobResponse],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit dossier documents for independent VerityAI scrutiny",
)
async def submit_scrutiny_job(
    background_tasks: BackgroundTasks,
    external_reference: str = Form(..., description="External application or dossier reference"),
    category_code: str = Form("ENGINEERING_AND_TECHNOLOGY", description="Regulatory category"),
    declared_data: str = Form("{}", description="JSON string of declared institutional metrics"),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    run_async: bool = Query(False, description="Whether to execute pipeline asynchronously"),
    files: List[UploadFile] = File(..., description="One or more supporting statutory documents"),
    db: Session = Depends(get_db),
    client: IntegrationClient = Depends(require_client_scope("scrutiny:create")),
):
    """
    Primary integration gateway endpoint. Accepts dossier documents, registers an idempotent
    scrutiny job, and initiates the multi-stage VerityAI evaluation pipeline.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_FILES_SUBMITTED", "message": "At least one document must be uploaded for scrutiny."},
        )

    try:
        parsed_declared = json.loads(declared_data) if declared_data else {}
    except Exception:
        parsed_declared = {}

    job = create_integration_job(
        db=db,
        client=client,
        external_reference=external_reference,
        category_code=category_code,
        declared_data=parsed_declared,
        files=files,
        idempotency_key=idempotency_key,
    )

    if run_async:
        background_tasks.add_task(_run_background_integration_scrutiny, job.id)
    else:
        # Synchronous execution
        job = execute_integration_job(db=db, job_id=job.id)

    return DataResponse(
        data=IntegrationJobResponse(
            job_id=job.id,
            client_id=job.client_id,
            external_reference=job.external_reference,
            status=job.status,
            stage=job.stage,
            category_code=job.category_code,
            submitted_documents_count=len(job.submitted_documents),
            duration_ms=job.duration_ms,
            created_at=job.created_at,
            completed_at=job.completed_at,
            polling_url=f"/api/v1/integrations/scrutiny-jobs/{job.id}",
        )
    )


@router.get(
    "/scrutiny-jobs/{job_id}",
    response_model=DataResponse[IntegrationJobResponse],
    summary="Query scrutiny job status and stage progress",
)
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    client: IntegrationClient = Depends(require_client_scope("scrutiny:read")),
):
    """Poll job status. Strictly enforces client tenant isolation."""
    job = get_authorized_integration_job(db=db, job_id=job_id, client_id=client.client_id)
    return DataResponse(
        data=IntegrationJobResponse(
            job_id=job.id,
            client_id=job.client_id,
            external_reference=job.external_reference,
            status=job.status,
            stage=job.stage,
            category_code=job.category_code,
            submitted_documents_count=len(job.submitted_documents),
            duration_ms=job.duration_ms,
            created_at=job.created_at,
            completed_at=job.completed_at,
            polling_url=f"/api/v1/integrations/scrutiny-jobs/{job.id}",
        )
    )


@router.get(
    "/scrutiny-jobs/{job_id}/results",
    response_model=DataResponse[IntegrationJobResultsResponse],
    summary="Retrieve evidence-linked findings and scrutiny evaluation summary",
)
def get_job_results(
    job_id: str,
    db: Session = Depends(get_db),
    client: IntegrationClient = Depends(require_client_scope("scrutiny:read")),
):
    """Retrieve structured findings, deterministic rule outcomes, and evidence citations."""
    job = get_authorized_integration_job(db=db, job_id=job_id, client_id=client.client_id)
    return DataResponse(
        data=IntegrationJobResultsResponse(
            job_id=job.id,
            client_id=job.client_id,
            external_reference=job.external_reference,
            status=job.status,
            stage=job.stage,
            summary=job.summary or {},
            findings=job.findings or [],
            rule_results=job.rule_results or [],
            provider_metadata=job.provider_metadata or {},
            completed_at=job.completed_at,
            report_available=bool(job.report_path and os.path.exists(job.report_path)),
        )
    )


@router.get(
    "/scrutiny-jobs/{job_id}/report",
    summary="Download synthesized decision-support scrutiny PDF report",
)
def download_job_report(
    job_id: str,
    db: Session = Depends(get_db),
    client: IntegrationClient = Depends(require_client_scope("scrutiny:read")),
):
    """Download the official scrutiny report PDF."""
    job = get_authorized_integration_job(db=db, job_id=job_id, client_id=client.client_id)
    if not job.report_path or not os.path.exists(job.report_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "REPORT_NOT_READY", "message": "Scrutiny report is not available for this job."},
        )

    return FileResponse(
        path=job.report_path,
        media_type="application/pdf",
        filename=f"VerityAI_Scrutiny_{job.id}.pdf",
    )
