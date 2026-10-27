import io
import uuid
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
from app.models.finding import Finding, FindingEvidence
from app.models.audit import AuditEvent
from app.core.security import create_access_token, hash_password


@pytest.fixture
def workspace_fixture(db_session: Session):
    """Seed fixtures for officer scrutiny workspace and applicant isolation testing."""
    inst_apex = Institution(
        id="INS-APEX-01",
        institution_name="Apex Institute of Technology",
        institution_identifier="SYN-APX-01",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
    )
    inst_beacon = Institution(
        id="INS-BEACON-02",
        institution_name="Beacon Technical Campus",
        institution_identifier="SYN-BCN-02",
        institution_type="TECHNICAL_COLLEGE",
        state="Karnataka",
        city="Bengaluru",
        status="ACTIVE",
    )
    applicant_user = User(
        id="USR-APP-01",
        email="registrar@apex.edu.in",
        display_name="Apex Registrar",
        password_hash=hash_password("PassRegistrar1!"),
        role="INSTITUTION_USER",
        institution_id="INS-APEX-01",
        is_active=True,
    )
    reviewer_user = User(
        id="USR-OFFICER-01",
        email="officer.patil@verityai.gov.in",
        display_name="Scrutiny Officer Patil",
        password_hash=hash_password("PassOfficer1!"),
        role="REVIEWER",
        is_active=True,
    )
    admin_user = User(
        id="USR-ADMIN-01",
        email="admin.deshmukh@verityai.gov.in",
        display_name="Administrator Deshmukh",
        password_hash=hash_password("PassAdmin1!"),
        role="ADMIN",
        is_active=True,
    )
    category = ApplicationCategory(
        code="CAT_OFFICER_TEST",
        name="Extension of Approval 2026-27",
        description="Category for officer workspace scrutiny tests",
        required_document_types=["ACCREDITATION_CERTIFICATE"],
        required_declared_fields=["institution_name"],
        enabled=True,
    )
    app_submitted = Application(
        id="APP-OFFICER-001",
        application_reference="VAI-2026-OFF-001",
        institution_id="INS-APEX-01",
        category_code=category.code,
        academic_year="2026-27",
        lifecycle_status="SUBMITTED",
        pipeline_status="NOT_STARTED",
        declared_data={"institution_name": "Apex Institute of Technology"},
        created_by=applicant_user.id,
        submitted_at=datetime.now(timezone.utc),
    )
    doc = Document(
        id="DOC-OFFICER-001",
        application_id=app_submitted.id,
        declared_type="ACCREDITATION_CERTIFICATE",
        effective_type="ACCREDITATION_CERTIFICATE",
        original_filename="accreditation_apex.pdf",
        storage_key="test/accreditation_apex.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="abc123sha256apex",
        uploaded_by=applicant_user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=1,
    )
    proc_run = ProcessingRun(
        id="RUN-OFFICER-001",
        document_id=doc.id,
        status="COMPLETED",
        pipeline_version="1.0.0",
    )
    page = DocumentPage(
        id="PAGE-OFFICER-001",
        document_id=doc.id,
        processing_run_id=proc_run.id,
        page_number=1,
        clean_text="Apex Institute of Technology\nApproved Intake: 300\nValid Until: 2028-06-30\n",
        text_source="DIRECT_EXTRACTION",
        ocr_mean_confidence=0.98,
        char_count=65,
    )

    db_session.add_all([
        inst_apex, inst_beacon, applicant_user, reviewer_user, admin_user,
        category, app_submitted, doc, proc_run, page,
    ])
    db_session.commit()

    return {
        "inst_apex": inst_apex,
        "inst_beacon": inst_beacon,
        "applicant": applicant_user,
        "reviewer": reviewer_user,
        "admin": admin_user,
        "category": category,
        "application": app_submitted,
        "document": doc,
    }


def _login(client: TestClient, user: User):
    token = create_access_token(subject=user.id, role=user.role, email=user.email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"


# ---------------------------------------------------------------------------
# 1. Authorized Officer Job Creation and Status Retrieval
# ---------------------------------------------------------------------------

def test_authorized_officer_can_create_and_retrieve_scrutiny_job(client: TestClient, workspace_fixture):
    """REVIEWER can trigger a scrutiny job, verify COMPLETED state, and retrieve details."""
    app_id = workspace_fixture["application"].id
    _login(client, workspace_fixture["reviewer"])

    # 1. Trigger scrutiny job (synchronous mode)
    resp = client.post(f"/api/v1/applications/{app_id}/scrutiny-jobs", json={"job_type": "FULL_SCRUTINY"})
    assert resp.status_code == 202
    job_data = resp.json()["data"]
    job_id = job_data["id"]

    assert job_id.startswith("JOB-")
    assert job_data["application_id"] == app_id
    assert job_data["status"] == "COMPLETED"
    assert job_data["duration_ms"] is not None
    assert job_data["triggered_by"] == workspace_fixture["reviewer"].id
    assert "stage_details" in job_data
    assert "results_summary" in job_data

    # 2. Retrieve job status by ID
    get_resp = client.get(f"/api/v1/scrutiny-jobs/{job_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == job_id
    assert get_resp.json()["data"]["status"] == "COMPLETED"

    # 3. List jobs for application
    list_resp = client.get(f"/api/v1/applications/{app_id}/scrutiny-jobs")
    assert list_resp.status_code == 200
    jobs_list = list_resp.json()["data"]
    assert len(jobs_list) >= 1
    assert any(j["id"] == job_id for j in jobs_list)


def test_admin_can_create_and_retrieve_scrutiny_job(client: TestClient, workspace_fixture):
    """ADMIN role also possesses authority to create and examine scrutiny jobs."""
    app_id = workspace_fixture["application"].id
    _login(client, workspace_fixture["admin"])

    list_before = client.get(f"/api/v1/applications/{app_id}/scrutiny-jobs").json()["data"]
    # If a previous job completed, we can run another one
    resp = client.post(f"/api/v1/applications/{app_id}/scrutiny-jobs", json={"job_type": "FULL_SCRUTINY"})
    assert resp.status_code == 202
    job = resp.json()["data"]
    assert job["triggered_by"] == workspace_fixture["admin"].id


# ---------------------------------------------------------------------------
# 2. Applicant & Unauthorized Role Denial on Scrutiny Jobs
# ---------------------------------------------------------------------------

def test_applicant_cannot_trigger_or_access_scrutiny_jobs(client: TestClient, workspace_fixture, db_session: Session):
    """Applicants are strictly forbidden from creating, listing, getting, or retrying scrutiny jobs."""
    app_id = workspace_fixture["application"].id
    _login(client, workspace_fixture["applicant"])

    # 1. Trigger denial
    resp_trigger = client.post(f"/api/v1/applications/{app_id}/scrutiny-jobs", json={"job_type": "FULL_SCRUTINY"})
    assert resp_trigger.status_code == 403
    assert resp_trigger.json()["error"]["code"] == "FORBIDDEN"

    # 2. Listing denial
    resp_list = client.get(f"/api/v1/applications/{app_id}/scrutiny-jobs")
    assert resp_list.status_code == 403

    # Seed an existing job to test retrieval & retry denial
    job = ScrutinyJob(
        id="JOB-SEED-001",
        application_id=app_id,
        status="FAILED",
        triggered_by=workspace_fixture["reviewer"].id,
        retry_count=0,
        max_retries=2,
    )
    db_session.add(job)
    db_session.commit()

    # 3. Detail denial
    resp_get = client.get(f"/api/v1/scrutiny-jobs/{job.id}")
    assert resp_get.status_code == 403

    # 4. Retry denial
    resp_retry = client.post(f"/api/v1/scrutiny-jobs/{job.id}/retry")
    assert resp_retry.status_code == 403


# ---------------------------------------------------------------------------
# 3. Applicant Denial on Internal Findings & Officer Reports
# ---------------------------------------------------------------------------

def test_applicant_cannot_access_internal_findings_or_reports(client: TestClient, workspace_fixture):
    """Applicants are blocked from accessing internal AI anomaly findings, candidate fields, and reports."""
    app_id = workspace_fixture["application"].id
    _login(client, workspace_fixture["applicant"])

    # 1. Findings analysis summary
    res_analysis = client.get(f"/api/v1/applications/{app_id}/analysis")
    assert res_analysis.status_code == 403

    # 2. Anomalies list
    res_anomalies = client.get(f"/api/v1/applications/{app_id}/anomalies")
    assert res_anomalies.status_code == 403

    # 3. Extracted candidate fields
    res_fields = client.get(f"/api/v1/applications/{app_id}/extracted-fields")
    assert res_fields.status_code == 403

    # 4. Officer review decision summary
    res_summary = client.get(f"/api/v1/applications/{app_id}/review-summary")
    assert res_summary.status_code == 403

    # 5. Evidence trace
    res_ev = client.get(f"/api/v1/applications/{app_id}/evidence")
    assert res_ev.status_code == 403

    # 6. Scrutiny reports listing
    res_reports = client.get(f"/api/v1/applications/{app_id}/reports")
    assert res_reports.status_code == 403


# ---------------------------------------------------------------------------
# 4. Duplicate Concurrent Trigger Prevention
# ---------------------------------------------------------------------------

def test_duplicate_trigger_prevention_on_active_job(client: TestClient, workspace_fixture, db_session: Session):
    """Attempting to trigger a scrutiny job while one is actively QUEUED or PROCESSING returns 409 Conflict."""
    app_id = workspace_fixture["application"].id
    _login(client, workspace_fixture["reviewer"])

    # Seed an active PROCESSING job
    active_job = ScrutinyJob(
        id="JOB-ACTIVE-001",
        application_id=app_id,
        status="PROCESSING",
        triggered_by=workspace_fixture["reviewer"].id,
        started_at=datetime.now(timezone.utc),
    )
    db_session.add(active_job)
    db_session.commit()

    resp = client.post(f"/api/v1/applications/{app_id}/scrutiny-jobs", json={"job_type": "FULL_SCRUTINY"})
    assert resp.status_code == 409
    err = resp.json()["error"]
    assert err["code"] == "SCRUTINY_JOB_ALREADY_ACTIVE"
    assert "currently active" in err["message"]


# ---------------------------------------------------------------------------
# 5. Retry Limits & Valid State Transitions
# ---------------------------------------------------------------------------

def test_scrutiny_job_retry_quota_and_state_guards(client: TestClient, workspace_fixture, db_session: Session):
    """Only FAILED jobs can be retried, and retrying enforces max_retries limit."""
    app_id = workspace_fixture["application"].id
    _login(client, workspace_fixture["reviewer"])

    # 1. Retrying a COMPLETED job fails with 400
    comp_job = ScrutinyJob(
        id="JOB-COMP-001",
        application_id=app_id,
        status="COMPLETED",
        triggered_by=workspace_fixture["reviewer"].id,
    )
    db_session.add(comp_job)
    db_session.commit()

    resp_comp_retry = client.post(f"/api/v1/scrutiny-jobs/{comp_job.id}/retry")
    assert resp_comp_retry.status_code == 400
    assert resp_comp_retry.json()["error"]["code"] == "INVALID_JOB_STATE"

    # 2. Retrying a FAILED job within quota succeeds
    fail_job = ScrutinyJob(
        id="JOB-FAIL-001",
        application_id=app_id,
        status="FAILED",
        triggered_by=workspace_fixture["reviewer"].id,
        retry_count=0,
        max_retries=2,
        error_code="PIPELINE_ERROR",
        safe_error_summary="Synthetic worker failure",
    )
    db_session.add(fail_job)
    db_session.commit()

    resp_retry_ok = client.post(f"/api/v1/scrutiny-jobs/{fail_job.id}/retry")
    assert resp_retry_ok.status_code == 200
    retried_data = resp_retry_ok.json()["data"]
    assert retried_data["status"] == "COMPLETED"
    assert retried_data["retry_count"] == 1

    # 3. Retrying when max_retries reached fails with 400
    fail_max = ScrutinyJob(
        id="JOB-FAIL-MAX",
        application_id=app_id,
        status="FAILED",
        triggered_by=workspace_fixture["reviewer"].id,
        retry_count=2,
        max_retries=2,
    )
    db_session.add(fail_max)
    db_session.commit()

    resp_max_retry = client.post(f"/api/v1/scrutiny-jobs/{fail_max.id}/retry")
    assert resp_max_retry.status_code == 400
    assert resp_max_retry.json()["error"]["code"] == "MAX_RETRIES_EXCEEDED"


# ---------------------------------------------------------------------------
# 6. Asynchronous Execution with BackgroundTasks
# ---------------------------------------------------------------------------

def test_async_scrutiny_job_execution(client: TestClient, workspace_fixture):
    """Triggering with ?run_async=true registers background task and executes."""
    app_id = workspace_fixture["application"].id
    _login(client, workspace_fixture["reviewer"])

    resp = client.post(f"/api/v1/applications/{app_id}/scrutiny-jobs?run_async=true", json={"job_type": "FULL_SCRUTINY"})
    assert resp.status_code == 202
    job_data = resp.json()["data"]
    assert job_data["id"].startswith("JOB-")

    # In TestClient, BackgroundTasks run during request teardown, so subsequent get should show COMPLETED
    get_resp = client.get(f"/api/v1/scrutiny-jobs/{job_data['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["status"] == "COMPLETED"


# ---------------------------------------------------------------------------
# 7. Persistence and Review Decision Workflow
# ---------------------------------------------------------------------------

def test_persisted_status_and_officer_review_actions(client: TestClient, workspace_fixture, db_session: Session):
    """Officer can execute statutory transition and verify immutable audit record."""
    app_id = workspace_fixture["application"].id
    reviewer = workspace_fixture["reviewer"]
    _login(client, reviewer)

    # 1. Officer transitions lifecycle status to UNDER_SCRUTINY
    tr_resp = client.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={
            "target_status": "UNDER_SCRUTINY",
            "reason": "Official scrutiny initiated by review officer",
            "reviewer_notes": "All required initial documents uploaded.",
        },
    )
    assert tr_resp.status_code == 200
    assert tr_resp.json()["data"]["lifecycle_status"] == "UNDER_SCRUTINY"

    # 2. Check application detail reflects assigned reviewer
    app_resp = client.get(f"/api/v1/applications/{app_id}")
    assert app_resp.status_code == 200
    assert app_resp.json()["data"]["lifecycle_status"] == "UNDER_SCRUTINY"
    assert app_resp.json()["data"]["assigned_reviewer_id"] == reviewer.id

    # 3. Verify audit record
    audit_events = list(
        db_session.query(AuditEvent).filter(AuditEvent.application_id == app_id).all()
    )
    assert any(e.actor_id == reviewer.id for e in audit_events)


# ---------------------------------------------------------------------------
# 8. Backward Compatibility with Existing Workflow Endpoints
# ---------------------------------------------------------------------------

def test_existing_workflow_endpoints_remain_functional(client: TestClient, workspace_fixture):
    """Existing endpoints /workflow/start, /workflow, and /readiness remain functional."""
    app_id = workspace_fixture["application"].id
    _login(client, workspace_fixture["reviewer"])

    # GET /readiness
    ready_resp = client.get(f"/api/v1/applications/{app_id}/readiness")
    assert ready_resp.status_code == 200
    assert "is_ready_for_scrutiny" in ready_resp.json()["data"]

    # GET /workflow
    wf_resp = client.get(f"/api/v1/applications/{app_id}/workflow")
    assert wf_resp.status_code == 200
    assert "stages" in wf_resp.json()["data"]

    # POST /workflow/start (authoritative fallback)
    start_resp = client.post(f"/api/v1/applications/{app_id}/workflow/start")
    assert start_resp.status_code == 200
    assert start_resp.json()["data"]["pipeline_status"] in ("COMPLETED", "NEEDS_REVIEW", "VALIDATION_FAILED")
