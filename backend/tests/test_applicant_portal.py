"""Tests for Phase 3: Applicant Portal & Institutional Intake Experience.
Validates:
1. Applicant dashboard and application list tenant isolation
2. Draft creation and resumption (PATCH /api/v1/applications/{id})
3. Declared data persistence and audit logging
4. Locking against edits after submission
5. Document upload and conditional checklist verification
6. Checklist endpoint tenant isolation
7. Incomplete submission blocking (Decision 2 Option A)
8. Successful formal submission with reference and timestamp stamping
9. Cross-institution access rejection (HTTP 403)
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.audit import AuditEvent
from app.core.security import create_access_token


@pytest.fixture
def applicant_fixture(db_session: Session):
    """Seed two distinct institutions with applicant users and statutory category."""
    inst_alpha = Institution(
        id="INS-ALPHA-01",
        institution_name="Alpha Engineering Institute",
        institution_identifier="AISHE-ALPHA-101",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    inst_beta = Institution(
        id="INS-BETA-02",
        institution_name="Beta Technical Polytechnic",
        institution_identifier="AISHE-BETA-202",
        institution_type="POLYTECHNIC",
        state="Karnataka",
        city="Bengaluru",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add_all([inst_alpha, inst_beta])

    user_alpha = User(
        id="USR-ALPHA-APP",
        email="applicant@alpha.edu.invalid",
        display_name="Alpha Registrar",
        password_hash="mocked",
        role="INSTITUTION_USER",
        institution_id=inst_alpha.id,
        data_origin="SYNTHETIC_DEMO",
    )
    user_beta = User(
        id="USR-BETA-APP",
        email="applicant@beta.edu.invalid",
        display_name="Beta Registrar",
        password_hash="mocked",
        role="INSTITUTION_USER",
        institution_id=inst_beta.id,
        data_origin="SYNTHETIC_DEMO",
    )
    user_reviewer = User(
        id="USR-OFFICER-01",
        email="officer@verityai.gov.invalid",
        display_name="Scrutiny Committee Member",
        password_hash="mocked",
        role="REVIEWER",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add_all([user_alpha, user_beta, user_reviewer])

    cat = ApplicationCategory(
        code="CAT_EOA_TEST",
        name="Extension of Approval Test",
        description="Annual statutory approval extension",
        provenance="STATUTORY_APH_2024_27",
        required_document_types=["ACCREDITATION_CERTIFICATE"],
        enabled=True,
    )
    db_session.add(cat)

    # Pre-create one draft application for Alpha
    app_alpha_draft = Application(
        id="APP-ALPHA-DRAFT",
        application_reference="VAI-2026-ALPHA1",
        institution_id=inst_alpha.id,
        category_code=cat.code,
        academic_year="2026-27",
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data={"principal_name": "Dr. Alpha Principal"},
        created_by=user_alpha.id,
    )

    # Pre-create one draft application for Beta
    app_beta_draft = Application(
        id="APP-BETA-DRAFT",
        application_reference="VAI-2026-BETA1",
        institution_id=inst_beta.id,
        category_code=cat.code,
        academic_year="2026-27",
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data={"principal_name": "Dr. Beta Principal"},
        created_by=user_beta.id,
    )
    db_session.add_all([app_alpha_draft, app_beta_draft])
    db_session.commit()

    return {
        "inst_alpha": inst_alpha,
        "inst_beta": inst_beta,
        "user_alpha": user_alpha,
        "user_beta": user_beta,
        "user_reviewer": user_reviewer,
        "cat": cat,
        "app_alpha_draft": app_alpha_draft,
        "app_beta_draft": app_beta_draft,
    }


def _login_as(client: TestClient, user: User):
    """Authenticate client session using role and subject identity."""
    token = create_access_token(
        subject=user.id,
        role=user.role,
        email=user.email,
    )
    client.cookies.set("access_token", token)
    return token


# ---------------------------------------------------------------------------
# 1. Applicant Dashboard & Scoped Application Listing
# ---------------------------------------------------------------------------

def test_applicant_dashboard_scoped_application_list(client: TestClient, applicant_fixture):
    """Applicant dashboard only lists applications belonging to their registered institution."""
    _login_as(client, applicant_fixture["user_alpha"])

    resp = client.get("/api/v1/applications")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == applicant_fixture["app_alpha_draft"].id
    assert data[0]["institution"]["id"] == applicant_fixture["inst_alpha"].id


# ---------------------------------------------------------------------------
# 2. Draft Creation, Saving, and Resumption (PATCH)
# ---------------------------------------------------------------------------

def test_applicant_create_and_resume_draft(client: TestClient, applicant_fixture):
    """Applicant creates a new draft, saves declared fields via PATCH, and resumes."""
    _login_as(client, applicant_fixture["user_alpha"])

    # 1. Create a second draft
    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": applicant_fixture["inst_alpha"].id,
            "category_code": applicant_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {"initial_flag": True},
        },
    )
    assert create_resp.status_code == 201
    new_app = create_resp.json()["data"]
    app_id = new_app["id"]
    assert new_app["lifecycle_status"] == "DRAFT"

    # 2. Update/Save Draft (PATCH)
    update_resp = client.patch(
        f"/api/v1/applications/{app_id}",
        json={
            "declared_data": {
                "principal_name": "Dr. S. K. Kulkarni",
                "approved_intake": 480,
                "land_area_acres": 7.5,
                "built_up_area_sqm": 15000,
                "land_ownership_type": "OWNED",
                "certificate_expiry_date": "2027-08-31",
            }
        },
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()["data"]
    assert updated_data["declared_data"]["principal_name"] == "Dr. S. K. Kulkarni"
    assert updated_data["declared_data"]["approved_intake"] == 480
    assert updated_data["declared_data"]["land_area_acres"] == 7.5

    # 3. Resume Draft: GET /api/v1/applications/{id} confirms persistence
    get_resp = client.get(f"/api/v1/applications/{app_id}")
    assert get_resp.status_code == 200
    detail = get_resp.json()["data"]
    assert detail["declared_data"]["built_up_area_sqm"] == 15000
    assert detail["lifecycle_status"] == "DRAFT"


def test_applicant_update_draft_records_audit_event(client: TestClient, applicant_fixture, db_session: Session):
    """Updating a draft creates an APPLICATION_UPDATED audit record."""
    _login_as(client, applicant_fixture["user_alpha"])
    app_id = applicant_fixture["app_alpha_draft"].id

    resp = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": {"updated_metric": 999}},
    )
    assert resp.status_code == 200

    audit = db_session.query(AuditEvent).filter_by(
        application_id=app_id,
        event_type="APPLICATION_UPDATED",
    ).first()
    assert audit is not None
    assert audit.actor_id == applicant_fixture["user_alpha"].id


# ---------------------------------------------------------------------------
# 3. Unauthorized Cross-Institution Mutations Rejected
# ---------------------------------------------------------------------------

def test_applicant_cross_tenant_update_blocked(client: TestClient, applicant_fixture):
    """Institution Alpha applicant cannot PATCH or mutate Beta's draft application."""
    _login_as(client, applicant_fixture["user_alpha"])
    beta_app_id = applicant_fixture["app_beta_draft"].id

    resp = client.patch(
        f"/api/v1/applications/{beta_app_id}",
        json={"declared_data": {"malicious_tamper": True}},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_applicant_cross_tenant_checklist_blocked(client: TestClient, applicant_fixture):
    """Institution Alpha applicant cannot retrieve Beta's application checklist."""
    _login_as(client, applicant_fixture["user_alpha"])
    beta_app_id = applicant_fixture["app_beta_draft"].id

    resp = client.get(f"/api/v1/applications/{beta_app_id}/checklist")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


# ---------------------------------------------------------------------------
# 4. Document Upload, Checklist Integration & Submission Locking
# ---------------------------------------------------------------------------

def test_applicant_document_upload_and_checklist_satisfaction(client: TestClient, applicant_fixture):
    """Applicant uploads mandatory ACCREDITATION_CERTIFICATE; checklist transitions to satisfied."""
    _login_as(client, applicant_fixture["user_alpha"])
    app_id = applicant_fixture["app_alpha_draft"].id

    # Check checklist before upload
    chk_before = client.get(f"/api/v1/applications/{app_id}/checklist")
    assert chk_before.status_code == 200
    items_before = chk_before.json()["data"]["items"]
    acc_item = next(i for i in items_before if i["document_code"] == "ACCREDITATION_CERTIFICATE")
    assert acc_item["is_present"] is False

    # Upload required document
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_resp = client.post(
        f"/api/v1/applications/{app_id}/documents",
        data={"declared_type": "ACCREDITATION_CERTIFICATE"},
        files={"file": ("accreditation.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_resp.status_code == 202

    # Check checklist after upload: now satisfied
    chk_after = client.get(f"/api/v1/applications/{app_id}/checklist")
    assert chk_after.status_code == 200
    items_after = chk_after.json()["data"]["items"]
    acc_item_after = next(i for i in items_after if i["document_code"] == "ACCREDITATION_CERTIFICATE")
    assert acc_item_after["is_present"] is True


def test_applicant_incomplete_submission_blocked(client: TestClient, applicant_fixture):
    """Submission is blocked when mandatory documents are missing (Decision 2 Option A)."""
    _login_as(client, applicant_fixture["user_alpha"])
    app_id = applicant_fixture["app_alpha_draft"].id

    # Submit without uploading mandatory document
    resp = client.post(f"/api/v1/applications/{app_id}/submit")
    assert resp.status_code == 400
    err = resp.json()["error"]
    assert err["code"] == "SUBMISSION_CHECKLIST_INCOMPLETE"
    assert "mandatory" in err["message"].lower()


def test_applicant_successful_submission_and_locking(client: TestClient, applicant_fixture):
    """Full submission workflow: upload required document -> submit -> locked against edits."""
    _login_as(client, applicant_fixture["user_alpha"])
    app_id = applicant_fixture["app_alpha_draft"].id

    # 1. Upload mandatory document
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    client.post(
        f"/api/v1/applications/{app_id}/documents",
        data={"declared_type": "ACCREDITATION_CERTIFICATE"},
        files={"file": ("accreditation.pdf", pdf_bytes, "application/pdf")},
    )

    # 2. Formally Submit
    submit_resp = client.post(f"/api/v1/applications/{app_id}/submit")
    assert submit_resp.status_code == 200
    data = submit_resp.json()["data"]
    assert data["lifecycle_status"] == "SUBMITTED"
    assert data["submitted_at"] is not None
    assert data["application_reference"] == "VAI-2026-ALPHA1"

    # 3. Post-submission edits are locked (PATCH returns 409 Conflict)
    edit_resp = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": {"late_change": "illegal"}},
    )
    assert edit_resp.status_code == 409
    assert edit_resp.json()["error"]["code"] == "APPLICATION_LOCKED"


def test_reviewer_can_view_submitted_applicant_dossier(client: TestClient, applicant_fixture):
    """Reviewer has cross-institutional scrutiny access to inspect the submitted applicant dossier."""
    # First submit as applicant
    _login_as(client, applicant_fixture["user_alpha"])
    app_id = applicant_fixture["app_alpha_draft"].id

    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    client.post(
        f"/api/v1/applications/{app_id}/documents",
        data={"declared_type": "ACCREDITATION_CERTIFICATE"},
        files={"file": ("accreditation.pdf", pdf_bytes, "application/pdf")},
    )
    client.post(f"/api/v1/applications/{app_id}/submit")

    # Now login as Reviewer
    _login_as(client, applicant_fixture["user_reviewer"])
    resp = client.get(f"/api/v1/applications/{app_id}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["lifecycle_status"] == "SUBMITTED"
    assert data["institution"]["institution_name"] == applicant_fixture["inst_alpha"].institution_name
