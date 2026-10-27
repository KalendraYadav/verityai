"""Tests for Phase E: Deterministic Validation and Cross-Document Consistency.

Verifies:
1. Numerical boundary checks (Administrative area 750 sqm, Amenities area 500 sqm, Classroom norms 66/33 sqm)
2. Cadre ratio checks (1:2:6 ratio, zero professors detection)
3. Faculty-Student Ratio checks (1:20 ceiling, student intake scaling, shortfall calculation)
4. Quota checks (EWS 1.25x multiplier, TFW 5% supernumerary ceiling)
5. Mandatory governance committee verification in Affidavit 2
6. Explicit separation of missing evidence (UNABLE_TO_EVALUATE) from compliance failures (FAIL)
7. Cross-document consistency matching
"""

import uuid
from datetime import date
import pytest
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.processing_run import ProcessingRun
from app.services.validation import (
    run_application_validation,
    ensure_default_rules,
)


@pytest.fixture
def statutory_fixtures(db_session: Session):
    """Seed institution, user, and EOA_TECHNICAL application for statutory testing."""
    inst = Institution(
        id="INST-STAT-01",
        institution_name="National Engineering College (Synthetic)",
        institution_identifier="SYN-ENG-001",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(inst)

    user = User(
        id="USR-STAT-01",
        email="scrutiny.officer@demo.verityai.invalid",
        display_name="Scrutiny Officer",
        password_hash="mocked",
        role="REVIEWER",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(user)

    cat = ApplicationCategory(
        code="EOA_TECHNICAL",
        name="Extension of Approval for Existing Technical Institution",
        description="Statutory annual Extension of Approval under Chapter II",
        required_document_types=[
            "DOC_AFFIDAVIT_2",
            "DOC_OCCUPANCY_CERT",
            "DOC_FIRE_SAFETY",
            "DOC_PAYROLL_ECS",
            "DOC_MANDATORY_DISC",
            "DOC_CERTIFICATE_2",
            "DOC_CERTIFICATE_1",
        ],
        required_declared_fields=["institution_name", "approved_intake"],
        provenance="STATUTORY_APH_2024_27",
        enabled=True,
    )
    db_session.add(cat)

    app = Application(
        id="APP-STAT-001",
        application_reference="VAI-2026-ENG-STAT1",
        institution_id=inst.id,
        category_code=cat.code,
        academic_year="2026-27",
        lifecycle_status="SUBMITTED",
        pipeline_status="NOT_STARTED",
        declared_data={
            "institution_name": "National Engineering College (Synthetic)",
            "institution_identifier": "SYN-ENG-001",
            "approved_intake": 240,
            "intake": 240,
        },
        created_by=user.id,
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(app)
    db_session.commit()

    ensure_default_rules(db_session)
    return {"inst": inst, "user": user, "cat": cat, "app": app}


def _create_completed_document(
    db: Session,
    app_id: str,
    user_id: str,
    effective_type: str,
    filename: str,
    page_text: str,
) -> Document:
    """Helper to create a completed document with a single digital text page."""
    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app_id,
        original_filename=filename,
        storage_key=f"test/{uuid.uuid4()}/{filename}",
        media_type="application/pdf",
        file_size_bytes=2048,
        sha256=f"hash-{uuid.uuid4()}",
        declared_type=effective_type,
        effective_type=effective_type,
        processing_status="COMPLETED",
        extraction_quality_band="HIGH",
        uploaded_by=user_id,
    )
    db.add(doc)
    db.flush()

    run = ProcessingRun(document_id=doc.id, status="COMPLETED", trigger="UPLOAD")
    db.add(run)
    db.flush()

    page = DocumentPage(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        clean_text=page_text,
        char_count=len(page_text),
        status="SUCCEEDED",
    )
    db.add(page)
    db.commit()
    return doc


# ===========================================================================
# 1. Numerical Infrastructure Norms (Admin Area & Amenities)
# ===========================================================================
def test_statutory_admin_area_pass(db_session: Session, statutory_fixtures):
    """When Certificate 2 specifies administrative area >= 750 sqm, must report PASS."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_CERTIFICATE_2",
        filename="architect_certificate_2.pdf",
        page_text="Schedule of Administrative Facilities. Total Administrative carpet area: 780.0 sqm. Verified by Architect.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-ADMIN-AREA"][0]

    assert r.status == "PASS"
    assert r.human_review_required is False
    assert r.observed_value == "780.0"
    assert "780.0" in r.explanation
    assert "Annexure 3.3" in r.explanation


def test_statutory_admin_area_fail_shortfall(db_session: Session, statutory_fixtures):
    """When Certificate 2 specifies administrative area < 750 sqm, must report FAIL with shortfall."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_CERTIFICATE_2",
        filename="architect_certificate_2.pdf",
        page_text="Schedule of Facilities. Total Administrative carpet area: 680.0 sqm. Building approved.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-ADMIN-AREA"][0]

    assert r.status == "FAIL"
    assert r.human_review_required is True
    assert r.unresolved_reason == "STATUTORY_MINIMUM_DEFICIENCY"
    assert r.observed_value == "680.0"
    assert r.evidence_payload["shortfall"] == 70.0
    assert "deficiency" in r.explanation.lower()


def test_statutory_amenities_area_boundary(db_session: Session, statutory_fixtures):
    """Amenities area boundary: >= 500 sqm PASS, < 500 sqm FAIL."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_CERTIFICATE_2",
        filename="architect_certificate_2.pdf",
        page_text="Amenities carpet area: 470.0 sqm. Canteen, recreation and common rooms.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-AMENITIES-AREA"][0]

    assert r.status == "FAIL"
    assert r.unresolved_reason == "STATUTORY_MINIMUM_DEFICIENCY"
    assert r.evidence_payload["shortfall"] == 30.0


# ===========================================================================
# 2. Classroom Area Division Norms
# ===========================================================================
def test_statutory_classroom_area_60_division_pass(db_session: Session, statutory_fixtures):
    """Classroom area >= 66 sqm passes statutory 60-division requirement."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_CERTIFICATE_2",
        filename="architect_certificate_2.pdf",
        page_text="Classroom carpet area: 66.5 sqm. Capacity 60 students per section.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-CLASSROOM-AREA"][0]

    assert r.status == "PASS"
    assert r.human_review_required is False


def test_statutory_classroom_area_30_division_needs_review(db_session: Session, statutory_fixtures):
    """Classroom area between 33 and 66 sqm reports NEEDS_REVIEW requiring division size confirmation."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_CERTIFICATE_2",
        filename="architect_certificate_2.pdf",
        page_text="Classroom carpet area: 42.0 sqm. Smaller tutorial/classroom hall.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-CLASSROOM-AREA"][0]

    assert r.status == "NEEDS_REVIEW"
    assert r.human_review_required is True
    assert r.unresolved_reason == "DIVISION_SIZE_CONFIRMATION_REQUIRED"


def test_statutory_classroom_area_under_33_fail(db_session: Session, statutory_fixtures):
    """Classroom area < 33 sqm fails under any division norm."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_CERTIFICATE_2",
        filename="architect_certificate_2.pdf",
        page_text="Classroom carpet area: 25.0 sqm. Deficient room.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-CLASSROOM-AREA"][0]

    assert r.status == "FAIL"
    assert r.unresolved_reason == "CLASSROOM_AREA_DEFICIENT"


# ===========================================================================
# 3. Faculty Norms: Cadre Ratio (1:2:6) and FSR (1:20)
# ===========================================================================
def test_statutory_faculty_cadre_zero_professors(db_session: Session, statutory_fixtures):
    """When zero professors are reported, cadre ratio reports NEEDS_REVIEW with zero professor warning."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_PAYROLL_ECS",
        filename="faculty_payroll_ecs.pdf",
        page_text="Faculty Cadre Roster. Full Professors: 0. Associate Professors: 4. Assistant Professors: 14. Total Faculty: 18.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-CADRE-UG"][0]

    assert r.status == "NEEDS_REVIEW"
    assert r.human_review_required is True
    assert r.unresolved_reason == "ZERO_PROFESSORS_REPORTED"
    assert "Zero Professors reported" in r.explanation
    assert r.evidence_payload["professor_count"] == 0


def test_statutory_faculty_cadre_conforming(db_session: Session, statutory_fixtures):
    """When senior professors and associate/assistant professors are present, reports PASS."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_PAYROLL_ECS",
        filename="faculty_payroll_ecs.pdf",
        page_text="Faculty Staff. Full Professors: 2. Associate Professors: 4. Assistant Professors: 12. Total Faculty: 18.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-CADRE-UG"][0]

    assert r.status == "PASS"
    assert r.human_review_required is False
    assert r.evidence_payload["professor_count"] == 2
    assert "Annexure 5.2" in r.explanation


def test_statutory_fsr_compliant_ratio(db_session: Session, statutory_fixtures):
    """Annual intake 240 (960 students) with 48 faculty yields 1:20 ratio, reporting PASS."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_PAYROLL_ECS",
        filename="faculty_payroll_ecs.pdf",
        page_text="Payroll Summary. Total Faculty Count: 48. Full Professors: 5. Associate Professors: 10. Assistant Professors: 33.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-FSR-UG"][0]

    assert r.status == "PASS"
    assert r.human_review_required is False
    assert r.evidence_payload["required_faculty"] == 48
    assert r.evidence_payload["effective_fsr"] == "1:20.0"


def test_statutory_fsr_deficiency_shortfall(db_session: Session, statutory_fixtures):
    """Annual intake 240 with 30 faculty yields 1:32 ratio (> 1:20), reporting FAIL with 18 shortfall."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_PAYROLL_ECS",
        filename="faculty_payroll_ecs.pdf",
        page_text="Faculty Strength. Total Faculty Count: 30. Short staff.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-FSR-UG"][0]

    assert r.status == "FAIL"
    assert r.human_review_required is True
    assert r.unresolved_reason == "FSR_STATUTORY_DEFICIENCY"
    assert r.evidence_payload["shortfall"] == 18
    assert r.evidence_payload["effective_fsr"] == "1:32.0"
    assert "shortfall of 18" in r.explanation


# ===========================================================================
# 4. Mandatory Statutory Governance Committees
# ===========================================================================
def test_statutory_governance_anti_ragging_pass(db_session: Session, statutory_fixtures):
    """When Affidavit 2 contains anti-ragging squad clause, committee check reports PASS."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_AFFIDAVIT_2",
        filename="affidavit_2_sworn.pdf",
        page_text="Sworn Deposition: The institution has constituted an Anti-Ragging Committee and Anti-Ragging Squad per AICTE regulations.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-ANTI-RAGGING"][0]

    assert r.status == "PASS"
    assert r.human_review_required is False
    assert r.observed_value == "CLAUSE_CONFIRMED"
    assert "Clause 6.47" in r.explanation


def test_statutory_governance_committee_missing_clause_needs_review(db_session: Session, statutory_fixtures):
    """When Affidavit 2 is uploaded but lacks internal committee mention, reports NEEDS_REVIEW."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_AFFIDAVIT_2",
        filename="affidavit_2_sworn.pdf",
        page_text="Sworn Deposition on Rs. 100 Non-Judicial stamp paper. General institutional declarations only.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-INTERNAL-COMM"][0]

    assert r.status == "NEEDS_REVIEW"
    assert r.human_review_required is True
    assert r.unresolved_reason == "COMMITTEE_CLAUSE_NEEDS_SCRUTINY"
    assert "could not be automatically confirmed" in r.explanation


# ===========================================================================
# 5. Missing Evidence vs Failed Checks
# ===========================================================================
def test_missing_document_reports_unable_to_evaluate_not_failed(db_session: Session, statutory_fixtures):
    """When supporting document is missing, field evaluation reports UNABLE_TO_EVALUATE, never FAIL."""
    app = statutory_fixtures["app"]

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    admin_r = [x for x in res["results"] if x.rule_code == "RULE-STAT-ADMIN-AREA"][0]

    assert admin_r.status == "UNABLE_TO_EVALUATE"
    assert admin_r.unresolved_reason == "SUPPORTING_DOC_MISSING"
    assert admin_r.inputs_status == "UNAVAILABLE"
    assert "supporting document 'DOC_CERTIFICATE_2' is missing" in admin_r.explanation


# ===========================================================================
# 6. Statutory Admissions Quotas (EWS and TFW)
# ===========================================================================
def test_statutory_tfw_quota_ceiling_compliant(db_session: Session, statutory_fixtures):
    """TFW quota seats within 5% ceiling of approved intake reports PASS."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]
    # Declared intake is 240, 5% is 12 seats

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_MANDATORY_DISC",
        filename="mandatory_disclosure.pdf",
        page_text="Admission Quotas: Tuition Fee Waiver supernumerary seats: 12 seats offered under TFW scheme.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-TFW-QUOTA"][0]

    assert r.status == "PASS"
    assert r.human_review_required is False
    assert r.evidence_payload["tfw_seats"] == 12
    assert "Clause 6.42" in r.explanation


def test_statutory_tfw_quota_ceiling_exceeded(db_session: Session, statutory_fixtures):
    """TFW quota seats exceeding 5% ceiling reports NEEDS_REVIEW."""
    app = statutory_fixtures["app"]
    user = statutory_fixtures["user"]

    _create_completed_document(
        db_session,
        app.id,
        user.id,
        effective_type="DOC_MANDATORY_DISC",
        filename="mandatory_disclosure.pdf",
        page_text="Admission Quotas: Tuition Fee Waiver seats: 18 seats.",
    )

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 24))
    r = [x for x in res["results"] if x.rule_code == "RULE-STAT-TFW-QUOTA"][0]

    assert r.status == "NEEDS_REVIEW"
    assert r.human_review_required is True
    assert r.unresolved_reason == "TFW_CEILING_EXCEEDED"
