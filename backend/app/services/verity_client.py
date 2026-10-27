import os
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.application import Application
from app.models.document import Document
from app.models.integration_client import IntegrationClient
from app.models.integration_job import IntegrationScrutinyJob
from app.services.api_key import create_api_client
from app.services.integration_scrutiny import (
    create_integration_job,
    execute_integration_job,
)

logger = logging.getLogger("verityai.client")

PORTAL_CLIENT_ID = "vai_client_portal_internal"


def get_or_create_portal_integration_client(db: Session) -> IntegrationClient:
    """Ensure the Current Institutional Portal is registered as an authorized integration client."""
    client = db.scalar(select(IntegrationClient).where(IntegrationClient.client_id == PORTAL_CLIENT_ID))
    if not client:
        client, raw_secret = create_api_client(
            db=db,
            client_name="Current Institutional Approval Portal",
            description="System integration client for AICTE Institutional Portal and Scrutiny Dossier.",
            scopes=["scrutiny:create", "scrutiny:read", "documents:upload", "admin:all"],
            custom_client_id=PORTAL_CLIENT_ID,
        )
        logger.info("Initialized system integration client: %s", PORTAL_CLIENT_ID)
    return client


class MockUploadWrapper:
    """Wrapper to pass existing stored documents to integration scrutiny without re-upload."""
    def __init__(self, original_filename: str, file_path: str, content_type: str = "application/pdf"):
        self.filename = original_filename
        self.content_type = content_type
        self.file_path = file_path

    @property
    def file(self):
        class _FileReader:
            def __init__(self, path):
                self.path = path
            def read(self):
                if os.path.exists(self.path):
                    with open(self.path, "rb") as f:
                        return f.read()
                return b""
        return _FileReader(self.file_path)


def trigger_portal_application_scrutiny(
    db: Session,
    application_id: str,
    actor_id: str,
) -> IntegrationScrutinyJob:
    """
    Server-side integration call from Current Institutional Portal to VerityAI Intelligence Gateway.
    Transfers dossier documents and declared metrics into an independent IntegrationScrutinyJob.
    """
    app = db.get(Application, application_id)
    if not app:
        raise ValueError(f"Application '{application_id}' not found.")

    client = get_or_create_portal_integration_client(db)

    # Fetch application documents
    docs = db.scalars(
        select(Document).where(
            Document.application_id == application_id,
            Document.deleted_at.is_(None)
        )
    ).all()

    upload_wrappers = []
    for d in docs:
        path = os.path.join("var", "uploads", d.storage_key) if not os.path.isabs(d.storage_key) else d.storage_key
        # Fallback check in uploads dir
        if not os.path.exists(path):
            path = os.path.join("var", "uploads", "documents", d.storage_key)
        upload_wrappers.append(
            MockUploadWrapper(
                original_filename=d.original_filename,
                file_path=path,
                content_type=d.media_type or "application/pdf"
            )
        )

    # Create decoupled integration job
    job = create_integration_job(
        db=db,
        client=client,
        external_reference=app.application_reference,
        category_code=app.category_code or "ENGINEERING_AND_TECHNOLOGY",
        declared_data=app.declared_data or {},
        files=upload_wrappers,
        idempotency_key=f"PORTAL-{app.id}-{app.updated_at.isoformat() if app.updated_at else 'init'}",
    )

    job.internal_application_id = app.id
    db.commit()

    # Execute scrutiny
    executed_job = execute_integration_job(db=db, job_id=job.id)

    # Update application lifecycle to UNDER_SCRUTINY if currently SUBMITTED
    if app.lifecycle_status == "SUBMITTED":
        app.lifecycle_status = "UNDER_SCRUTINY"
        if not app.assigned_reviewer_id:
            app.assigned_reviewer_id = actor_id
        db.commit()

    return executed_job
