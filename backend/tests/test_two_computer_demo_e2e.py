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
from app.models.finding import Finding
from app.models.audit import AuditEvent
from app.core.security import create_access_token, hash_password


@pytest.fixture
def two_computer_fixture(db_session: Session):
    """Seed data representing the shared database accessed by Computer A (Applicant) and Computer B (Officer)."""
    # 1. Institution
    inst = Institution(
        id="INS-DEMO-2PC",
        institution_name="National Institute of Technology & Engineering",
        institution_identifier="SYN-NITE-01",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
    )
    # 2. Computer A: Institutional Applicant (Registrar)
    applicant = User(
        id="USR-COMP-A-APPLICANT",
        email="registrar@nite.edu.in",
        display_name="NITE Registrar (Computer A)",
        password_hash=hash_password("ApplicantPass123!"),
        role="INSTITUTION_USER",
        institution_id=inst.id,
        is_active=True,
    )
    # 3. Computer B: Regulatory Scrutiny Officer
    officer = User(
        id="USR-COMP-B-OFFICER",
        email="officer.verity@verityai.gov.in",
        display_name="Scrutiny Officer (Computer B)",
        password_hash=hash_password("OfficerPass123!"),
        role="REVIEWER",
        institution_id=None,
        is_active=True,
    )
    # 4. Regulatory Category
    category = ApplicationCategory(
        code="CAT_2PC_DEMO",
        name="Extension of Approval (EOA) 2026-27",
        description="Statutory approval category for 2-computer live demonstration",
        required_document_types=["ACCREDITATION_CERTIFICATE"],
        required_declared_fields=["institution_name"],
        enabled=True,
    )

    db_session.add_all([inst, applicant, officer, category])
    db_session.commit()

    return {
        "institution": inst,
        "applicant": applicant,
        "officer": officer,
        "category": category,
    }


def _create_client_session(app, user: User) -> TestClient:
    """Simulate a physical browser session with authentication cookies and custom CSRF headers."""
    client = TestClient(app)
    token = create_access_token(subject=user.id, role=user.role, email=user.email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"
    return client


def test_complete_two_computer_live_demo_workflow(two_computer_fixture, db_session: Session):
    """Simulates the end-to-end live demonstration between Computer A (Applicant) and Computer B (Officer).
    Follows every step in Section 3 of the Phase 5 Directive against the authoritative shared persistence engine.
    """
    from app.main import app

    applicant_user = two_computer_fixture["applicant"]
    officer_user = two_computer_fixture["officer"]
    category = two_computer_fixture["category"]
    institution = two_computer_fixture["institution"]

    # =========================================================================
    # PART 1: COMPUTER A — APPLICANT ACTIONS
    # =========================================================================

    # 1. Log in as INSTITUTION_USER on Computer A
    computer_a = _create_client_session(app, applicant_user)

    # Verify applicant's isolated identity
    me_resp = computer_a.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["role"] == "INSTITUTION_USER"
    assert me_resp.json()["data"]["institution_id"] == institution.id

    # 2. Create an application and save a draft
    create_payload = {
        "institution_id": institution.id,
        "category_code": category.code,
        "academic_year": "2026-27",
        "declared_data": {
            "institution_name": "National Institute of Technology & Engineering",
            "principal_name": "Dr. R. K. Sharma",
            "approved_intake": 480,
            "land_area_acres": 5.2,
        },
    }
    create_resp = computer_a.post("/api/v1/applications", json=create_payload)
    assert create_resp.status_code == 201
    app_data = create_resp.json()["data"]
    app_id = app_data["id"]
    app_ref = app_data["application_reference"]
    assert app_data["lifecycle_status"] == "DRAFT"
    assert app_ref.startswith("VAI-")

    # 3. Simulate browser refresh / new session on Computer A & verify draft persistence
    computer_a_refreshed = _create_client_session(app, applicant_user)
    get_draft_resp = computer_a_refreshed.get(f"/api/v1/applications/{app_id}")
    assert get_draft_resp.status_code == 200
    persisted_draft = get_draft_resp.json()["data"]
    assert persisted_draft["id"] == app_id
    assert persisted_draft["lifecycle_status"] == "DRAFT"
    assert persisted_draft["declared_data"]["approved_intake"] == 480

    # 4. Attempt submission before uploading mandatory documents (should be blocked)
    premature_submit = computer_a_refreshed.post(f"/api/v1/applications/{app_id}/submit")
    assert premature_submit.status_code == 400
    assert premature_submit.json()["error"]["code"] == "SUBMISSION_CHECKLIST_INCOMPLETE"
    assert "Accreditation Certificate" in premature_submit.json()["error"]["message"]

    # 5. Upload required statutory document
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_resp = computer_a_refreshed.post(
        f"/api/v1/applications/{app_id}/documents",
        data={"declared_type": "ACCREDITATION_CERTIFICATE"},
        files={"file": ("accreditation_cert.pdf", pdf_content, "application/pdf")},
    )
    assert upload_resp.status_code == 202
    doc_id = upload_resp.json()["data"]["id"]

    # 6. Verify checklist completeness
    checklist_resp = computer_a_refreshed.get(f"/api/v1/applications/{app_id}/checklist")
    assert checklist_resp.status_code == 200
    checklist_data = checklist_resp.json()["data"]
    items = checklist_data["items"]
    acc_item = next(i for i in items if i["document_code"] == "ACCREDITATION_CERTIFICATE")
    assert acc_item["is_present"] is True
    assert checklist_data["total_present"] >= 1

    # 7. Formally submit application
    submit_resp = computer_a_refreshed.post(f"/api/v1/applications/{app_id}/submit")
    assert submit_resp.status_code == 200
    submitted_data = submit_resp.json()["data"]
    assert submitted_data["lifecycle_status"] == "SUBMITTED"
    assert submitted_data["submitted_at"] is not None

    # 8. Confirm application becomes read-only (locked)
    patch_resp = computer_a_refreshed.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": {"approved_intake": 600}},
    )
    assert patch_resp.status_code == 409
    assert patch_resp.json()["error"]["code"] == "APPLICATION_LOCKED"

    # 9. Verify that applicant CANNOT access internal findings or officer-only reports
    assert computer_a_refreshed.get(f"/api/v1/applications/{app_id}/analysis").status_code == 403
    assert computer_a_refreshed.get(f"/api/v1/applications/{app_id}/anomalies").status_code == 403
    assert computer_a_refreshed.get(f"/api/v1/applications/{app_id}/extracted-fields").status_code == 403
    assert computer_a_refreshed.get(f"/api/v1/applications/{app_id}/review-summary").status_code == 403
    assert computer_a_refreshed.get(f"/api/v1/applications/{app_id}/evidence").status_code == 403
    assert computer_a_refreshed.get(f"/api/v1/applications/{app_id}/reports").status_code == 403
    assert computer_a_refreshed.get(f"/api/v1/applications/{app_id}/scrutiny-jobs").status_code == 403
    assert computer_a_refreshed.post(f"/api/v1/applications/{app_id}/scrutiny-jobs").status_code == 403

    # =========================================================================
    # PART 2: COMPUTER B — REGULATORY OFFICER ACTIONS
    # =========================================================================

    # 1. Log in as REVIEWER on Computer B
    computer_b = _create_client_session(app, officer_user)

    # Verify officer's regulatory authority
    officer_me = computer_b.get("/api/v1/auth/me")
    assert officer_me.status_code == 200
    assert officer_me.json()["data"]["role"] == "REVIEWER"

    # 2. Locate the submitted application from Computer A in the Scrutiny Queue
    queue_resp = computer_b.get("/api/v1/scrutiny-queue")
    assert queue_resp.status_code == 200
    queue_items = queue_resp.json()["data"]
    target_in_queue = next((q for q in queue_items if q["id"] == app_id), None)
    assert target_in_queue is not None
    assert target_in_queue["application_reference"] == app_ref
    assert target_in_queue["lifecycle_status"] == "SUBMITTED"

    # 3. Open application dossier and inspect uploaded documents
    docs_resp = computer_b.get(f"/api/v1/applications/{app_id}/documents")
    assert docs_resp.status_code == 200
    docs_list = docs_resp.json()["data"]
    assert len(docs_list) >= 1
    assert any(d["id"] == doc_id for d in docs_list)

    # 4. Trigger scrutiny through persistent Scrutiny Job API
    job_trigger_resp = computer_b.post(
        f"/api/v1/applications/{app_id}/scrutiny-jobs",
        json={"job_type": "FULL_SCRUTINY"},
    )
    assert job_trigger_resp.status_code == 202
    job_result = job_trigger_resp.json()["data"]
    job_id = job_result["id"]
    assert job_id.startswith("JOB-")
    assert job_result["status"] == "COMPLETED"
    assert job_result["duration_ms"] is not None

    # 5. Check persistent scrutiny job retrieval by ID
    job_get_resp = computer_b.get(f"/api/v1/scrutiny-jobs/{job_id}")
    assert job_get_resp.status_code == 200
    assert job_get_resp.json()["data"]["status"] == "COMPLETED"

    # 6. Retrieve real findings and reports generated by the authoritative pipeline
    analysis_resp = computer_b.get(f"/api/v1/applications/{app_id}/analysis")
    assert analysis_resp.status_code == 200
    analysis_data = analysis_resp.json()["data"]
    assert "total_anomalies" in analysis_data
    assert "severity_breakdown" in analysis_data

    # Generate official Scrutiny Dossier Report (PDF)
    report_gen_resp = computer_b.post(
        f"/api/v1/applications/{app_id}/reports",
        json={"format": "PDF"},
    )
    assert report_gen_resp.status_code == 200
    report_data = report_gen_resp.json()
    assert report_data["application_id"] == app_id
    assert report_data["format"] == "PDF"
    assert report_data["file_size_bytes"] > 0
    report_id = report_data["id"]

    # 7. Record an authorized review determination (human oversight)
    transition_resp = computer_b.post(
        f"/api/v1/applications/{app_id}/workflow/transitions",
        json={
            "target_status": "ACTION_REQUIRED",
            "reason": "Scrutiny Officer Sharma flagged clarification required on land title deed",
            "reviewer_notes": "Statutory documents extracted; verifying accreditation parameters.",
        },
    )
    assert transition_resp.status_code == 200
    assert transition_resp.json()["data"]["lifecycle_status"] == "ACTION_REQUIRED"

    # 8. Verify immutable audit ledger records the officer's action
    audit_resp = computer_b.get(f"/api/v1/applications/{app_id}/audit-events")
    assert audit_resp.status_code == 200
    audit_records = audit_resp.json()["data"]
    assert len(audit_records) >= 3
    # Check that both APPLICATION_SUBMITTED and APPLICATION_STATUS_TRANSITION exist
    events = [a["event_type"] for a in audit_records]
    assert "APPLICATION_SUBMITTED" in events
    assert "APPLICATION_STATUS_TRANSITION" in events

    # =========================================================================
    # PART 3: CROSS-COMPUTER SYNCHRONIZATION & REFRESH VERIFICATION
    # =========================================================================

    # Computer A refreshes again; sees that lifecycle status updated to ACTION_REQUIRED
    refreshed_a = computer_a.get(f"/api/v1/applications/{app_id}")
    assert refreshed_a.status_code == 200
    assert refreshed_a.json()["data"]["lifecycle_status"] == "ACTION_REQUIRED"

    # Computer B confirms report download has proper security headers
    download_resp = computer_b.get(f"/api/v1/reports/{report_id}/download")
    assert download_resp.status_code == 200
    assert download_resp.headers["X-Content-Type-Options"] == "nosniff"
    assert download_resp.headers["Cache-Control"] == "no-store, no-cache, must-revalidate"
