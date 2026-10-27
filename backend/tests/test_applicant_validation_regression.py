"""Regression test suite for Institutional Applicant Portal validation.

Covers the 13 required regression scenarios:
1. Missing application category.
2. Missing academic year.
3. Invalid academic year format.
4. Missing required declared metrics at submission.
5. Negative or invalid numeric values (rejection of negatives, non-integers, booleans, invalid strings).
6. Missing/invalid text fields and malformed date strings.
7. Attempt to update/progress draft with invalid data (rejected with 422).
8. Attempt to submit an application with missing required fields (rejected with 400 APPLICATION_INCOMPLETE).
9. Attempt to submit without required documents (rejected with 400 SUBMISSION_CHECKLIST_INCOMPLETE).
10. Successful progression with valid data (draft creation -> metric update).
11. Successful submission when all applicable requirements are satisfied (locks application against edits).
12. Draft save and resume behavior (incomplete drafts can be saved and resumed safely).
13. Direct API requests attempting to bypass validation (all rejected with structured errors).
"""

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.audit import AuditEvent
from app.core.security import create_access_token


@pytest.fixture
def validation_fixture(db_session: Session):
    """Seed test fixtures: institution, applicant user, reviewer, and statutory category."""
    inst_primary = Institution(
        id="INS-REGRESS-01",
        institution_name="National Institute of Technology Example",
        institution_identifier="AISHE-REG-101",
        institution_type="ENGINEERING_COLLEGE",
        state="Delhi",
        city="New Delhi",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    inst_secondary = Institution(
        id="INS-REGRESS-02",
        institution_name="Secondary Technical Campus",
        institution_identifier="AISHE-REG-202",
        institution_type="POLYTECHNIC",
        state="Haryana",
        city="Gurugram",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add_all([inst_primary, inst_secondary])

    user_applicant = User(
        id="USR-REG-APP-01",
        email="applicant@nit-example.edu.invalid",
        display_name="Dr. Registrar Example",
        password_hash="mocked",
        role="INSTITUTION_USER",
        institution_id=inst_primary.id,
        data_origin="SYNTHETIC_DEMO",
    )
    user_other_applicant = User(
        id="USR-REG-APP-02",
        email="applicant@secondary.edu.invalid",
        display_name="Secondary Registrar",
        password_hash="mocked",
        role="INSTITUTION_USER",
        institution_id=inst_secondary.id,
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add_all([user_applicant, user_other_applicant])

    # Statutory Category requiring ACCREDITATION_CERTIFICATE document and declared fields
    cat = ApplicationCategory(
        code="CAT_REGRESS_EOA",
        name="Regression Test Extension of Approval",
        description="Statutory category for validation regression testing",
        provenance="STATUTORY_APH_2024_27",
        required_document_types=["ACCREDITATION_CERTIFICATE"],
        required_declared_fields=[
            "principal_name",
            "approved_intake",
            "land_area_acres",
            "built_up_area_sqm",
            "land_ownership_type",
        ],
        enabled=True,
    )
    db_session.add(cat)
    db_session.commit()

    return {
        "inst": inst_primary,
        "inst_other": inst_secondary,
        "user": user_applicant,
        "user_other": user_other_applicant,
        "cat": cat,
    }


def _login(client: TestClient, user: User) -> str:
    """Set access token cookie for the user."""
    token = create_access_token(
        subject=user.id,
        role=user.role,
        email=user.email,
    )
    client.cookies.set("access_token", token)
    return token


# ---------------------------------------------------------------------------
# 1. Missing Application Category
# ---------------------------------------------------------------------------
def test_regression_missing_application_category(client: TestClient, validation_fixture):
    """Attempting to create an application without category_code must be rejected with HTTP 422."""
    _login(client, validation_fixture["user"])

    # Missing field entirely
    resp1 = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "academic_year": "2026-27",
        },
    )
    assert resp1.status_code == 422

    # Empty string category_code
    resp2 = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": "   ",
            "academic_year": "2026-27",
        },
    )
    assert resp2.status_code == 422


# ---------------------------------------------------------------------------
# 2. Missing Academic Year
# ---------------------------------------------------------------------------
def test_regression_missing_academic_year(client: TestClient, validation_fixture):
    """Attempting to create an application with null, empty, or whitespace academic_year must be rejected with HTTP 422."""
    _login(client, validation_fixture["user"])

    # Null academic_year
    resp1 = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": None,
        },
    )
    assert resp1.status_code == 422

    # Blank academic_year
    resp2 = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "",
        },
    )
    assert resp2.status_code == 422

    # Whitespace academic_year
    resp3 = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "    ",
        },
    )
    assert resp3.status_code == 422


# ---------------------------------------------------------------------------
# 3. Invalid Academic Year
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "invalid_year",
    ["2026", "2026-2027", "26-27", "2026/27", "abcd-ef", "2026-7", "2026-278"],
)
def test_regression_invalid_academic_year(client: TestClient, validation_fixture, invalid_year):
    """Non-conforming academic_year formats (not YYYY-YY) must be rejected with HTTP 422."""
    _login(client, validation_fixture["user"])

    # On creation
    resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": invalid_year,
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 4. Missing Required Declared Metrics at Submission
# ---------------------------------------------------------------------------
def test_regression_missing_required_declared_metrics_at_submission(client: TestClient, validation_fixture):
    """Attempting submission when required declared metrics are missing must fail with 400 APPLICATION_INCOMPLETE."""
    _login(client, validation_fixture["user"])

    # 1. Create draft with valid Step 1
    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {"principal_name": "Dr. Valid Head"},
        },
    )
    assert create_resp.status_code == 201
    app_id = create_resp.json()["data"]["id"]

    # 2. Upload mandatory document
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    client.post(
        f"/api/v1/applications/{app_id}/documents",
        data={"declared_type": "ACCREDITATION_CERTIFICATE"},
        files={"file": ("accreditation.pdf", pdf_bytes, "application/pdf")},
    )

    # 3. Attempt submission while missing approved_intake, land_area_acres, built_up_area_sqm, land_ownership_type
    submit_resp = client.post(f"/api/v1/applications/{app_id}/submit")
    assert submit_resp.status_code == 400
    err = submit_resp.json()["error"]
    assert err["code"] == "APPLICATION_INCOMPLETE"
    assert "approved_intake" in err["message"] or "land_area_acres" in err["message"]


# ---------------------------------------------------------------------------
# 5. Negative or Invalid Numeric Values
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "bad_metric_payload",
    [
        {"approved_intake": -50},
        {"approved_intake": 120.75},  # Non-integer intake
        {"approved_intake": True},     # Boolean masquerading as number
        {"approved_intake": "not_a_number"},
        {"land_area_acres": -2.5},
        {"land_area_acres": False},
        {"built_up_area_sqm": -1000},
        {"building_age_years": -3},
        {"building_age_years": 12.3}, # Age must be integer
    ],
)
def test_regression_negative_or_invalid_numeric_values(client: TestClient, validation_fixture, bad_metric_payload):
    """Declared metrics reject negative numbers, non-integers where required, booleans, and invalid strings."""
    _login(client, validation_fixture["user"])

    # Create initial draft
    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {},
        },
    )
    assert create_resp.status_code == 201
    app_id = create_resp.json()["data"]["id"]

    # Attempt to PATCH invalid metric
    patch_resp = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": bad_metric_payload},
    )
    assert patch_resp.status_code == 422


# ---------------------------------------------------------------------------
# 6. Missing/Invalid Text Fields and Date Formats
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "bad_text_payload",
    [
        {"principal_name": 12345},
        {"principal_name": ["List", "Of", "Names"]},
        {"land_ownership_type": 999},
        {"certificate_expiry_date": "31-12-2027"},  # Wrong format
        {"certificate_expiry_date": "2027/12/31"},  # Wrong format
        {"certificate_expiry_date": "invalid-date"},
    ],
)
def test_regression_invalid_text_and_date_fields(client: TestClient, validation_fixture, bad_text_payload):
    """Text and date fields in declared_data reject non-string types and invalid date formats."""
    _login(client, validation_fixture["user"])

    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
        },
    )
    assert create_resp.status_code == 201
    app_id = create_resp.json()["data"]["id"]

    patch_resp = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": bad_text_payload},
    )
    assert patch_resp.status_code == 422


# ---------------------------------------------------------------------------
# 7. Attempt to Progress from a Step with Invalid Data
# ---------------------------------------------------------------------------
def test_regression_attempt_to_progress_with_invalid_data(client: TestClient, validation_fixture):
    """Server-side checks reject malformed metric updates, preserving pristine draft state."""
    _login(client, validation_fixture["user"])

    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {"principal_name": "Dr. Original Head"},
        },
    )
    app_id = create_resp.json()["data"]["id"]

    # Attempt to update with negative built_up_area_sqm
    invalid_patch = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": {"built_up_area_sqm": -500}},
    )
    assert invalid_patch.status_code == 422

    # Verification: draft retains original valid data without corruption
    get_resp = client.get(f"/api/v1/applications/{app_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["declared_data"] == {"principal_name": "Dr. Original Head"}


# ---------------------------------------------------------------------------
# 8. Attempt to Submit with Missing Required Fields
# ---------------------------------------------------------------------------
def test_regression_attempt_to_submit_with_missing_required_fields(client: TestClient, validation_fixture):
    """Submission endpoint blocks submission if any category.required_declared_fields is missing."""
    _login(client, validation_fixture["user"])

    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {
                "principal_name": "Dr. Example",
                # missing approved_intake, land_area_acres, built_up_area_sqm, land_ownership_type
            },
        },
    )
    app_id = create_resp.json()["data"]["id"]

    # Upload document to satisfy document checklist
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    client.post(
        f"/api/v1/applications/{app_id}/documents",
        data={"declared_type": "ACCREDITATION_CERTIFICATE"},
        files={"file": ("accreditation.pdf", pdf_bytes, "application/pdf")},
    )

    submit_resp = client.post(f"/api/v1/applications/{app_id}/submit")
    assert submit_resp.status_code == 400
    assert submit_resp.json()["error"]["code"] == "APPLICATION_INCOMPLETE"


# ---------------------------------------------------------------------------
# 9. Attempt to Submit Without Required Documents
# ---------------------------------------------------------------------------
def test_regression_attempt_to_submit_without_required_documents(client: TestClient, validation_fixture):
    """Submission endpoint blocks submission when declared metrics are complete but mandatory documents are absent."""
    _login(client, validation_fixture["user"])

    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {
                "principal_name": "Dr. Example",
                "approved_intake": 300,
                "land_area_acres": 5.0,
                "built_up_area_sqm": 8000,
                "land_ownership_type": "OWNED",
            },
        },
    )
    app_id = create_resp.json()["data"]["id"]

    # Submit WITHOUT uploading ACCREDITATION_CERTIFICATE
    submit_resp = client.post(f"/api/v1/applications/{app_id}/submit")
    assert submit_resp.status_code == 400
    assert submit_resp.json()["error"]["code"] == "SUBMISSION_CHECKLIST_INCOMPLETE"


# ---------------------------------------------------------------------------
# 10. Successful Progression with Valid Data
# ---------------------------------------------------------------------------
def test_regression_successful_progression_with_valid_data(client: TestClient, validation_fixture):
    """User can create draft in Step 1 and update metrics in Step 2 with valid values."""
    _login(client, validation_fixture["user"])

    # Step 1: Valid category, year, institution
    step1_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {"programme_name": "Computer Science and Engineering"},
        },
    )
    assert step1_resp.status_code == 201
    app_data = step1_resp.json()["data"]
    app_id = app_data["id"]

    # Step 2: Valid declared metrics
    step2_resp = client.patch(
        f"/api/v1/applications/{app_id}",
        json={
            "declared_data": {
                "programme_name": "Computer Science and Engineering",
                "principal_name": "Prof. A. K. Sharma",
                "approved_intake": 420,
                "land_area_acres": 6.8,
                "built_up_area_sqm": 12000,
                "building_age_years": 8,
                "land_ownership_type": "OWNED",
                "certificate_number": "STAT-2026-001",
                "certificate_expiry_date": "2028-06-30",
            }
        },
    )
    assert step2_resp.status_code == 200
    saved = step2_resp.json()["data"]["declared_data"]
    assert saved["principal_name"] == "Prof. A. K. Sharma"
    assert saved["approved_intake"] == 420
    assert saved["land_area_acres"] == 6.8
    assert saved["land_ownership_type"] == "OWNED"


# ---------------------------------------------------------------------------
# 11. Successful Submission When All Requirements Satisfied
# ---------------------------------------------------------------------------
def test_regression_successful_submission_when_all_requirements_satisfied(
    client: TestClient, validation_fixture, db_session: Session
):
    """When all declared fields and statutory documents are provided, submission succeeds and locks the application."""
    _login(client, validation_fixture["user"])

    # Step 1 & 2: Complete declared metrics
    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {
                "principal_name": "Prof. Fully Compliant",
                "approved_intake": 600,
                "land_area_acres": 10.0,
                "built_up_area_sqm": 25000,
                "land_ownership_type": "OWNED",
            },
        },
    )
    app_id = create_resp.json()["data"]["id"]

    # Step 3: Upload mandatory document
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_resp = client.post(
        f"/api/v1/applications/{app_id}/documents",
        data={"declared_type": "ACCREDITATION_CERTIFICATE"},
        files={"file": ("accreditation.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_resp.status_code == 202

    # Step 4: Submit
    submit_resp = client.post(f"/api/v1/applications/{app_id}/submit")
    assert submit_resp.status_code == 200
    sub_data = submit_resp.json()["data"]
    assert sub_data["lifecycle_status"] == "SUBMITTED"
    assert sub_data["submitted_at"] is not None

    # Locking verification: post-submission PATCH is blocked
    lock_resp = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": {"tamper": True}},
    )
    assert lock_resp.status_code == 409
    assert lock_resp.json()["error"]["code"] == "APPLICATION_LOCKED"

    # Audit verification
    audit = db_session.query(AuditEvent).filter_by(
        application_id=app_id,
        event_type="APPLICATION_SUBMITTED",
    ).first()
    assert audit is not None


# ---------------------------------------------------------------------------
# 12. Draft Save and Resume Behavior
# ---------------------------------------------------------------------------
def test_regression_draft_save_and_resume_behavior(client: TestClient, validation_fixture):
    """Partially completed drafts can be saved incrementally and resumed without premature rejection."""
    _login(client, validation_fixture["user"])

    # Initial draft with minimal data
    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
            "declared_data": {},
        },
    )
    assert create_resp.status_code == 201
    app_id = create_resp.json()["data"]["id"]

    # Save draft with only principal_name (incomplete, but valid)
    save1 = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": {"principal_name": "Dr. Early Save"}},
    )
    assert save1.status_code == 200

    # Resume draft via GET
    resume1 = client.get(f"/api/v1/applications/{app_id}")
    assert resume1.status_code == 200
    assert resume1.json()["data"]["declared_data"]["principal_name"] == "Dr. Early Save"
    assert resume1.json()["data"]["lifecycle_status"] == "DRAFT"

    # Save additional metrics incrementally
    save2 = client.patch(
        f"/api/v1/applications/{app_id}",
        json={
            "declared_data": {
                "principal_name": "Dr. Early Save",
                "approved_intake": 180,
                "land_area_acres": 4.5,
            }
        },
    )
    assert save2.status_code == 200
    assert save2.json()["data"]["declared_data"]["approved_intake"] == 180


# ---------------------------------------------------------------------------
# 13. Direct API Requests Attempting to Bypass Validation
# ---------------------------------------------------------------------------
def test_regression_direct_api_bypass_attempts(client: TestClient, validation_fixture):
    """Direct API calls attempting to bypass frontend validation or tenant isolation are firmly blocked."""
    _login(client, validation_fixture["user"])

    # Bypass 1: Malformed academic_year directly to PATCH
    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": validation_fixture["inst"].id,
            "category_code": validation_fixture["cat"].code,
            "academic_year": "2026-27",
        },
    )
    app_id = create_resp.json()["data"]["id"]

    bypass_year = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"academic_year": "MALFORMED_YEAR"},
    )
    assert bypass_year.status_code == 422

    # Bypass 2: Negative number directly to PATCH
    bypass_num = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": {"approved_intake": -999}},
    )
    assert bypass_num.status_code == 422

    # Bypass 3: Direct submission bypass when incomplete
    bypass_submit = client.post(f"/api/v1/applications/{app_id}/submit")
    assert bypass_submit.status_code == 400
    assert bypass_submit.json()["error"]["code"] in ["APPLICATION_INCOMPLETE", "SUBMISSION_CHECKLIST_INCOMPLETE"]

    # Bypass 4: Cross-tenant direct mutation bypass
    _login(client, validation_fixture["user_other"])
    bypass_cross = client.patch(
        f"/api/v1/applications/{app_id}",
        json={"declared_data": {"tamper": True}},
    )
    assert bypass_cross.status_code == 403
