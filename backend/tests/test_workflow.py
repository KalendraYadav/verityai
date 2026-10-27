from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.processing_run import ProcessingRun
from app.models.user import User
from app.models.audit import AuditEvent
from app.core.security import hash_password


from app.core.security import create_access_token


@pytest.fixture
def workflow_seed(client: TestClient, db_session: Session):
    """Seed data for workflow testing."""
    reviewer = User(
        id="usr-wf-reviewer",
        email="scrutiny.officer@verityai.gov.in",
        display_name="Officer Ramesh",
        password_hash=hash_password("RameshSecurePass1!"),
        role="REVIEWER",
        is_active=True,
    )
    inst = Institution(
        id="inst-wf-01",
        institution_name="National Engineering Institute",
        institution_identifier="NEI-1001",
        institution_type="TECHNICAL_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
    )
    cat = ApplicationCategory(
        code="CAT_EOA",
        name="Extension of Approval",
        description="Annual EOA scrutiny",
        required_document_types=["LAND_TITLE", "BUILDING_PLAN"],
        required_declared_fields=["institution_name", "approved_intake"],
        enabled=True,
    )
    app = Application(
        id="app-wf-01",
        application_reference="APP-2026-WF-001",
        institution_id=inst.id,
        category_code=cat.code,
        academic_year="2026-2027",
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data={"institution_name": "National Engineering Institute", "approved_intake": "360"},
        created_by=reviewer.id,
    )
    db_session.add_all([reviewer, inst, cat, app])
    db_session.commit()

    token = create_access_token(reviewer.id, reviewer.role, reviewer.email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"

    return {"reviewer": reviewer, "institution": inst, "category": cat, "application": app}


def test_get_application_readiness_documents_pending(client: TestClient, workflow_seed):
    app_id = workflow_seed["application"].id
    resp = client.get(f"/api/v1/applications/{app_id}/readiness")
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert data["is_ready_for_scrutiny"] is False
    assert data["readiness_state"] == "DOCUMENTS_PENDING"
    assert len(data["document_readiness"]["missing_types"]) == 2
    assert "LAND_TITLE" in data["document_readiness"]["missing_types"]
    assert "BUILDING_PLAN" in data["document_readiness"]["missing_types"]
    assert len(data["blockers"]) > 0


def test_workflow_start_and_progression(client: TestClient, workflow_seed, db_session: Session):
    app_id = workflow_seed["application"].id
    reviewer_id = workflow_seed["reviewer"].id

    # Add 2 processed documents satisfying the category requirements
    doc1 = Document(
        id="doc-wf-01",
        application_id=app_id,
        original_filename="land_title.pdf",
        storage_key="app-wf-01/doc-wf-01/original.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="sha-wf-001",
        declared_type="LAND_TITLE",
        effective_type="LAND_TITLE",
        processing_status="EXTRACTED",
        uploaded_by=reviewer_id,
    )
    doc2 = Document(
        id="doc-wf-02",
        application_id=app_id,
        original_filename="building_plan.pdf",
        storage_key="app-wf-01/doc-wf-02/original.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="sha-wf-002",
        declared_type="BUILDING_PLAN",
        effective_type="BUILDING_PLAN",
        processing_status="EXTRACTED",
        uploaded_by=reviewer_id,
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    run1 = ProcessingRun(
        id="run-wf-01",
        document_id=doc1.id,
        status="COMPLETED",
        trigger="TEST",
    )
    run2 = ProcessingRun(
        id="run-wf-02",
        document_id=doc2.id,
        status="COMPLETED",
        trigger="TEST",
    )
    db_session.add_all([run1, run2])
    db_session.flush()

    # Add document pages with extracted text
    page1 = DocumentPage(
        id="page-wf-01",
        document_id=doc1.id,
        processing_run_id=run1.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        raw_text="National Engineering Institute Land Registry Document Approved Intake: 360",
        clean_text="National Engineering Institute Land Registry Document Approved Intake: 360",
        char_count=75,
    )
    page2 = DocumentPage(
        id="page-wf-02",
        document_id=doc2.id,
        processing_run_id=run2.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        raw_text="Approved Building Plan for National Engineering Institute",
        clean_text="Approved Building Plan for National Engineering Institute",
        char_count=57,
    )
    db_session.add_all([page1, page2])
    db_session.commit()

    # Trigger workflow start
    start_resp = client.post(f"/api/v1/applications/{app_id}/workflow/start")
    assert start_resp.status_code == 200
    wf_data = start_resp.json()["data"]
    assert wf_data["application_id"] == app_id
    assert wf_data["stages"]["documents"]["status"] == "COMPLETE"
    assert wf_data["stages"]["validation"]["status"] == "COMPLETE"

    # Check readiness now
    readiness_resp = client.get(f"/api/v1/applications/{app_id}/readiness")
    assert readiness_resp.status_code == 200
    readiness_data = readiness_resp.json()["data"]
    assert readiness_data["document_readiness"]["complete"] is True
    assert readiness_data["processing_readiness"]["complete"] is True


def test_lifecycle_state_transitions(client: TestClient, workflow_seed):
    app_id = workflow_seed["application"].id
    reviewer_id = workflow_seed["reviewer"].id

    # 1. DRAFT -> SUBMITTED
    resp1 = client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "SUBMITTED", "reason": "Institutional applicant completed filing"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["data"]["lifecycle_status"] == "SUBMITTED"

    # 2. SUBMITTED -> UNDER_SCRUTINY
    resp2 = client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "UNDER_SCRUTINY", "reason": "Officer Ramesh initiated detailed review"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["data"]["lifecycle_status"] == "UNDER_SCRUTINY"

    # 3. UNDER_SCRUTINY -> ACTION_REQUIRED
    resp3 = client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "ACTION_REQUIRED", "reason": "Need updated fire safety NOC"},
    )
    assert resp3.status_code == 200
    assert resp3.json()["data"]["lifecycle_status"] == "ACTION_REQUIRED"

    # 4. ACTION_REQUIRED -> SUBMITTED
    resp4 = client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "SUBMITTED", "reason": "Applicant re-uploaded valid NOC"},
    )
    assert resp4.status_code == 200
    assert resp4.json()["data"]["lifecycle_status"] == "SUBMITTED"

    # 5. SUBMITTED -> UNDER_SCRUTINY -> SCRUTINY_COMPLETED
    client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "UNDER_SCRUTINY"},
    )
    resp5 = client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "SCRUTINY_COMPLETED", "reviewer_notes": "All requirements verified and documented"},
    )
    assert resp5.status_code == 200
    assert resp5.json()["data"]["lifecycle_status"] == "SCRUTINY_COMPLETED"


def test_invalid_lifecycle_state_transitions(client: TestClient, workflow_seed):
    app_id = workflow_seed["application"].id

    # Current is DRAFT: direct jump to SCRUTINY_COMPLETED is invalid
    bad_jump = client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "SCRUTINY_COMPLETED"},
    )
    assert bad_jump.status_code == 400
    assert bad_jump.json()["error"]["code"] == "INVALID_STATE_TRANSITION"

    # Completely invalid status name
    bad_name = client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "NON_EXISTENT_STATE"},
    )
    assert bad_name.status_code == 400
    assert bad_name.json()["error"]["code"] == "INVALID_STATE"


def test_scrutiny_queue_endpoint(client: TestClient, workflow_seed):
    app_id = workflow_seed["application"].id

    # Transition to SUBMITTED so it appears in scrutiny queue
    client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={"target_status": "SUBMITTED"},
    )

    resp = client.get("/api/v1/scrutiny-queue")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1
    found = next((item for item in data if item["id"] == app_id), None)
    assert found is not None
    assert found["application_reference"] == "APP-2026-WF-001"
    assert found["institution_name"] == "National Engineering Institute"


def test_workflow_idempotency_and_audit(client: TestClient, workflow_seed, db_session: Session):
    app_id = workflow_seed["application"].id

    # Start workflow twice
    resp1 = client.post(f"/api/v1/applications/{app_id}/workflow/start")
    assert resp1.status_code == 200

    resp2 = client.post(f"/api/v1/applications/{app_id}/workflow/start")
    assert resp2.status_code == 200

    # Ensure audit events logged
    audit_events = list(
        db_session.query(AuditEvent)
        .filter(AuditEvent.application_id == app_id, AuditEvent.event_type == "WORKFLOW_INITIATED")
        .all()
    )
    assert len(audit_events) == 2
