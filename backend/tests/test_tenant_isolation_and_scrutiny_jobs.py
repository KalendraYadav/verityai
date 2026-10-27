import io
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.processing_run import ProcessingRun
from app.models.user import User
from app.models.scrutiny_job import ScrutinyJob
from app.core.security import create_access_token, hash_password


@pytest.fixture
def multi_tenant_fixture(db_session: Session):
    """Seed two distinct institutions and their institutional users."""
    inst1 = Institution(
        id="INS-ALPHA",
        institution_name="Alpha Institute of Technology",
        institution_identifier="SYN-ALPHA-01",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
    )
    inst2 = Institution(
        id="INS-BETA",
        institution_name="Beta College of Engineering",
        institution_identifier="SYN-BETA-02",
        institution_type="TECHNICAL_COLLEGE",
        state="Karnataka",
        city="Bengaluru",
        status="ACTIVE",
    )
    user_alpha = User(
        id="USR-ALPHA-01",
        email="registrar@alpha.edu.in",
        display_name="Alpha Registrar",
        password_hash=hash_password("PassAlpha123!"),
        role="INSTITUTION_USER",
        institution_id="INS-ALPHA",
        is_active=True,
    )
    user_beta = User(
        id="USR-BETA-01",
        email="registrar@beta.edu.in",
        display_name="Beta Registrar",
        password_hash=hash_password("PassBeta123!"),
        role="INSTITUTION_USER",
        institution_id="INS-BETA",
        is_active=True,
    )
    reviewer = User(
        id="USR-REV-01",
        email="officer@verityai.gov.in",
        display_name="Scrutiny Officer Sharma",
        password_hash=hash_password("PassOfficer123!"),
        role="REVIEWER",
        is_active=True,
    )
    category = ApplicationCategory(
        code="CAT_EOA_TEST",
        name="Extension of Approval Test",
        description="Test Category",
        required_document_types=["ACCREDITATION_CERTIFICATE"],
        required_declared_fields=["institution_name"],
        enabled=True,
    )
    app_alpha = Application(
        id="APP-ALPHA-001",
        application_reference="VAI-ALPHA-001",
        institution_id="INS-ALPHA",
        category_code=category.code,
        academic_year="2026-27",
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data={"institution_name": "Alpha Institute of Technology"},
        created_by=user_alpha.id,
    )
    app_beta = Application(
        id="APP-BETA-001",
        application_reference="VAI-BETA-001",
        institution_id="INS-BETA",
        category_code=category.code,
        academic_year="2026-27",
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data={"institution_name": "Beta College of Engineering"},
        created_by=user_beta.id,
    )

    db_session.add_all([inst1, inst2, user_alpha, user_beta, reviewer, category, app_alpha, app_beta])
    db_session.commit()

    return {
        "inst_alpha": inst1,
        "inst_beta": inst2,
        "user_alpha": user_alpha,
        "user_beta": user_beta,
        "reviewer": reviewer,
        "category": category,
        "app_alpha": app_alpha,
        "app_beta": app_beta,
    }


def _login_as(client: TestClient, user: User) -> None:
    token = create_access_token(subject=user.id, role=user.role, email=user.email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"


# ---------------------------------------------------------------------------
# 1. Tenant Isolation Tests (Computer A - Institutional Applicant)
# ---------------------------------------------------------------------------

def test_applicant_list_applications_tenant_scoped(client: TestClient, multi_tenant_fixture):
    """Applicant from Alpha only receives Alpha applications."""
    _login_as(client, multi_tenant_fixture["user_alpha"])
    resp = client.get("/api/v1/applications")
    assert resp.status_code == 200
    apps = resp.json()["data"]
    assert len(apps) == 1
    assert apps[0]["id"] == "APP-ALPHA-001"
    assert apps[0]["institution"]["id"] == "INS-ALPHA"


def test_applicant_querying_other_institution_rejected(client: TestClient, multi_tenant_fixture):
    """Applicant from Alpha explicitly requesting Beta institution_id receives 403 Forbidden."""
    _login_as(client, multi_tenant_fixture["user_alpha"])
    resp = client.get("/api/v1/applications?institution_id=INS-BETA")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_applicant_cannot_view_other_institution_application(client: TestClient, multi_tenant_fixture):
    """Applicant from Alpha requesting Beta application detail receives 403 Forbidden."""
    _login_as(client, multi_tenant_fixture["user_alpha"])
    resp = client.get("/api/v1/applications/APP-BETA-001")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_applicant_cannot_create_application_for_other_institution(client: TestClient, multi_tenant_fixture):
    """Applicant from Alpha submitting payload with institution_id = INS-BETA receives 403 Forbidden."""
    _login_as(client, multi_tenant_fixture["user_alpha"])
    payload = {
        "institution_id": "INS-BETA",
        "category_code": multi_tenant_fixture["category"].code,
        "academic_year": "2026-27",
        "declared_data": {"institution_name": "Tampered Name"},
    }
    resp = client.post("/api/v1/applications", json=payload)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_applicant_cannot_upload_document_to_other_institution_application(client: TestClient, multi_tenant_fixture):
    """Applicant from Alpha uploading to Beta application receives 403 Forbidden."""
    _login_as(client, multi_tenant_fixture["user_alpha"])
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    resp = client.post(
        "/api/v1/applications/APP-BETA-001/documents",
        files={"file": ("certificate.pdf", pdf_bytes, "application/pdf")},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_applicant_cannot_list_documents_of_other_institution(client: TestClient, multi_tenant_fixture):
    """Applicant from Alpha listing documents for Beta application receives 403 Forbidden."""
    _login_as(client, multi_tenant_fixture["user_alpha"])
    resp = client.get("/api/v1/applications/APP-BETA-001/documents")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


# ---------------------------------------------------------------------------
# 2. Submission Completeness Gating (Decision 2 Option A)
# ---------------------------------------------------------------------------

def test_submission_blocked_when_mandatory_documents_missing(client: TestClient, multi_tenant_fixture):
    """Attempting to submit an application without required documents returns 400 Bad Request."""
    _login_as(client, multi_tenant_fixture["user_alpha"])
    resp = client.post("/api/v1/applications/APP-ALPHA-001/submit")
    assert resp.status_code == 400
    err = resp.json()["error"]
    assert err["code"] == "SUBMISSION_CHECKLIST_INCOMPLETE"
    assert "Missing" in err["message"]


def test_submission_succeeds_when_mandatory_documents_present(client: TestClient, multi_tenant_fixture, db_session: Session):
    """Uploading the mandatory document allows successful submission and locks the application."""
    _login_as(client, multi_tenant_fixture["user_alpha"])

    # Upload required ACCREDITATION_CERTIFICATE
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_resp = client.post(
        "/api/v1/applications/APP-ALPHA-001/documents",
        data={"declared_type": "ACCREDITATION_CERTIFICATE"},
        files={"file": ("accreditation.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_resp.status_code == 202

    # Now submit
    submit_resp = client.post("/api/v1/applications/APP-ALPHA-001/submit")
    assert submit_resp.status_code == 200
    data = submit_resp.json()["data"]
    assert data["lifecycle_status"] == "SUBMITTED"
    assert data["submitted_at"] is not None

    # Verify duplicate submission is blocked
    resubmit_resp = client.post("/api/v1/applications/APP-ALPHA-001/submit")
    assert resubmit_resp.status_code == 409
    assert resubmit_resp.json()["error"]["code"] == "INVALID_STATE_TRANSITION"


# ---------------------------------------------------------------------------
# 3. Persistent Scrutiny Job State Machine (Decision 1 Option A)
# ---------------------------------------------------------------------------

def test_scrutiny_job_creation_and_execution_lifecycle(client: TestClient, multi_tenant_fixture, db_session: Session):
    """Reviewer triggers scrutiny job on submitted application; job executes and completes."""
    app_id = "APP-ALPHA-001"
    app = db_session.get(Application, app_id)
    app.lifecycle_status = "SUBMITTED"
    db_session.commit()

    _login_as(client, multi_tenant_fixture["reviewer"])

    # 1. Trigger Scrutiny Job
    resp = client.post(f"/api/v1/applications/{app_id}/scrutiny-jobs", json={"job_type": "FULL_SCRUTINY"})
    assert resp.status_code == 202
    job_data = resp.json()["data"]
    job_id = job_data["id"]

    assert job_id.startswith("JOB-")
    assert job_data["application_id"] == app_id
    assert job_data["status"] == "COMPLETED"
    assert job_data["duration_ms"] is not None
    assert "stage_details" in job_data
    assert "documents" in job_data["stage_details"]

    # 2. Retrieve job by ID
    get_resp = client.get(f"/api/v1/scrutiny-jobs/{job_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == job_id

    # 3. List jobs for application
    list_resp = client.get(f"/api/v1/applications/{app_id}/scrutiny-jobs")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) >= 1


def test_applicant_cannot_trigger_scrutiny_job(client: TestClient, multi_tenant_fixture):
    """Applicant role is forbidden from triggering scrutiny jobs (403 Forbidden)."""
    _login_as(client, multi_tenant_fixture["user_alpha"])
    resp = client.post("/api/v1/applications/APP-ALPHA-001/scrutiny-jobs")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_scrutiny_job_retry_quota_enforcement(client: TestClient, multi_tenant_fixture, db_session: Session):
    """Failed scrutiny jobs can be retried up to max_retries limit."""
    _login_as(client, multi_tenant_fixture["reviewer"])

    # Create a synthetic failed job
    failed_job = ScrutinyJob(
        id="JOB-FAIL-01",
        application_id="APP-ALPHA-001",
        status="FAILED",
        triggered_by=multi_tenant_fixture["reviewer"].id,
        retry_count=2,  # Already at max_retries (2)
        max_retries=2,
        error_code="TEST_ERROR",
        safe_error_summary="Synthetic failure",
    )
    db_session.add(failed_job)
    db_session.commit()

    # Retry should fail due to quota
    retry_resp = client.post(f"/api/v1/scrutiny-jobs/{failed_job.id}/retry")
    assert retry_resp.status_code == 400
    assert retry_resp.json()["error"]["code"] == "MAX_RETRIES_EXCEEDED"
