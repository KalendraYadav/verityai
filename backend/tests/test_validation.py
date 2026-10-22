import uuid
from datetime import date, datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.processing_run import ProcessingRun
from app.models.validation import ValidationRule, ValidationRun, RuleResult
from app.models.audit import AuditEvent
from app.services.validation import (
    run_application_validation,
    ensure_default_rules,
    parse_date_string,
)


@pytest.fixture
def base_fixtures(db_session: Session):
    """Seed base institution, user, category, and application for validation tests."""
    inst = Institution(
        id="INST-VAL-01",
        institution_name="National Institute of Technology (Synthetic)",
        institution_identifier="SYN-VAL-001",
        institution_type="ENGINEERING_COLLEGE",
        state="Karnataka",
        city="Surathkal",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(inst)

    user = User(
        id="USR-VAL-01",
        email="val.user@demo.verityai.invalid",
        display_name="Validation User",
        password_hash="mocked",
        role="REVIEWER",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(user)

    cat = ApplicationCategory(
        code="EOA_ILLUSTRATIVE",
        name="Extension of Approval (Illustrative)",
        description="Demo category",
        required_document_types=["ACCREDITATION_CERTIFICATE", "LAND_USE_CERTIFICATE"],
        required_declared_fields=["institution_name", "approved_intake"],
        provenance="ILLUSTRATIVE",
        enabled=True,
    )
    db_session.add(cat)

    app = Application(
        id="APP-VAL-001",
        application_reference="VAI-2026-VAL1",
        institution_id=inst.id,
        category_code=cat.code,
        academic_year="2026-27",
        lifecycle_status="SUBMITTED",
        pipeline_status="NOT_STARTED",
        declared_data={
            "institution_name": "National Institute of Technology (Synthetic)",
            "institution_identifier": "SYN-VAL-001",
            "certificate_number": "CERT-NBA-2026-999",
            "certificate_expiry_date": "2028-06-30",
            "approved_intake": 120,
        },
        created_by=user.id,
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(app)
    db_session.commit()

    ensure_default_rules(db_session)
    return {"inst": inst, "user": user, "cat": cat, "app": app}


# ===========================================================================
# 1. Date Parsing Unit Tests
# ===========================================================================
def test_parse_date_string_iso():
    dt, amb, err = parse_date_string("2028-06-30")
    assert dt == date(2028, 6, 30)
    assert not amb
    assert err is None


def test_parse_date_string_dmy():
    dt, amb, err = parse_date_string("31/12/2027")
    assert dt == date(2027, 12, 31)
    assert not amb
    assert err is None


def test_parse_date_string_ambiguous():
    dt, amb, err = parse_date_string("06/07/2027")
    assert dt is not None
    assert amb is True
    assert err is None


def test_parse_date_string_textual_month():
    dt, amb, err = parse_date_string("31 March 2029")
    assert dt == date(2029, 3, 31)
    assert not amb
    assert err is None


def test_parse_date_string_malformed():
    dt, amb, err = parse_date_string("invalid-date-token")
    assert dt is None
    assert err == "UNPARSEABLE_DATE_FORMAT"


# ===========================================================================
# 2. REQUIRED_DOCUMENT Rule Tests
# ===========================================================================
def test_required_document_missing(db_session: Session, base_fixtures):
    """When no documents are uploaded, required documents must report FAIL."""
    app = base_fixtures["app"]
    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))

    results = res["results"]
    doc_res = [r for r in results if r.rule_code == "RULE-DOC-ACCRED"][0]

    assert doc_res.status == "FAIL"
    assert doc_res.human_review_required is True
    assert doc_res.unresolved_reason == "DOCUMENT_NOT_SUBMITTED"
    assert "missing from the institutional submission" in doc_res.explanation


def test_required_document_present_and_processed(db_session: Session, base_fixtures):
    """When required document is uploaded and completed, must report PASS."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key1.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-123",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="COMPLETED",
        extraction_quality_band="HIGH",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    doc_res = [r for r in res["results"] if r.rule_code == "RULE-DOC-ACCRED"][0]

    assert doc_res.status == "PASS"
    assert doc_res.human_review_required is False
    assert "processed successfully" in doc_res.explanation
    assert doc_res.source_document_id == doc.id


def test_required_document_processing_in_progress(db_session: Session, base_fixtures):
    """When document is still in PROCESSING or QUEUED, must report NEEDS_REVIEW."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key2.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-456",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="PROCESSING",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    doc_res = [r for r in res["results"] if r.rule_code == "RULE-DOC-ACCRED"][0]

    assert doc_res.status == "NEEDS_REVIEW"
    assert doc_res.human_review_required is True
    assert doc_res.unresolved_reason == "DOCUMENT_PROCESSING_INCOMPLETE"
    assert "text extraction is currently in progress" in doc_res.explanation


def test_required_document_extraction_failed(db_session: Session, base_fixtures):
    """When text extraction failed, required document check must report NEEDS_REVIEW."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key3.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-789",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="FAILED",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    doc_res = [r for r in res["results"] if r.rule_code == "RULE-DOC-ACCRED"][0]

    assert doc_res.status == "NEEDS_REVIEW"
    assert doc_res.human_review_required is True
    assert doc_res.unresolved_reason == "EXTRACTION_FAILED"
    assert "automated text extraction failed" in doc_res.explanation


# ===========================================================================
# 3. REQUIRED_FIELD Rule Tests
# ===========================================================================
def test_required_field_present_on_page(db_session: Session, base_fixtures):
    """When certificate_number is present in page clean_text, must report PASS."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key4.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-101",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="COMPLETED",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.flush()

    run = ProcessingRun(document_id=doc.id, status="COMPLETED", trigger="UPLOAD")
    db_session.add(run)
    db_session.flush()

    page = DocumentPage(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        clean_text="National Board of Accreditation. Registration No: NBA-2026-ENG-4421. All criteria verified.",
        char_count=85,
        status="SUCCEEDED",
    )
    db_session.add(page)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    fld_res = [r for r in res["results"] if r.rule_code == "RULE-FLD-CERTNO"][0]

    assert fld_res.status == "PASS"
    assert fld_res.human_review_required is False
    assert fld_res.observed_value == "NBA-2026-ENG-4421"
    assert fld_res.source_page_number == 1


def test_required_field_missing_on_readable_document(db_session: Session, base_fixtures):
    """When document is readable but certificate number is not found, must report NEEDS_REVIEW."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key5.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-102",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="COMPLETED",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.flush()

    run = ProcessingRun(document_id=doc.id, status="COMPLETED", trigger="UPLOAD")
    db_session.add(run)
    db_session.flush()

    page = DocumentPage(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        clean_text="Notice of meeting. The council met on Monday to discuss syllabus updates.",
        char_count=70,
        status="SUCCEEDED",
    )
    db_session.add(page)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    fld_res = [r for r in res["results"] if r.rule_code == "RULE-FLD-CERTNO"][0]

    assert fld_res.status == "NEEDS_REVIEW"
    assert fld_res.human_review_required is True
    assert fld_res.unresolved_reason == "FIELD_NOT_EXTRACTED"


# ===========================================================================
# 4. EXPIRY_CHECK Rule Tests
# ===========================================================================
def test_expiry_check_valid_date(db_session: Session, base_fixtures):
    """When certificate expiry date is in the future relative to evaluation date, must report PASS."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key6.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-103",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="COMPLETED",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.flush()

    run = ProcessingRun(document_id=doc.id, status="COMPLETED", trigger="UPLOAD")
    db_session.add(run)
    db_session.flush()

    page = DocumentPage(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        clean_text="Accreditation Certificate. Valid Until: 2028-12-31. Approved by Council.",
        char_count=80,
        status="SUCCEEDED",
    )
    db_session.add(page)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    exp_res = [r for r in res["results"] if r.rule_code == "RULE-EXP-ACCRED"][0]

    assert exp_res.status == "PASS"
    assert exp_res.human_review_required is False
    assert exp_res.observed_value == "2028-12-31"
    assert "Document certificate is valid" in exp_res.explanation


def test_expiry_check_expired_date(db_session: Session, base_fixtures):
    """When certificate expiry date is in the past relative to evaluation date, must report FAIL."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key7.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-104",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="COMPLETED",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.flush()

    run = ProcessingRun(document_id=doc.id, status="COMPLETED", trigger="UPLOAD")
    db_session.add(run)
    db_session.flush()

    page = DocumentPage(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        clean_text="Accreditation Certificate. Valid Until: 2024-05-15. Expired status.",
        char_count=75,
        status="SUCCEEDED",
    )
    db_session.add(page)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    exp_res = [r for r in res["results"] if r.rule_code == "RULE-EXP-ACCRED"][0]

    assert exp_res.status == "FAIL"
    assert exp_res.human_review_required is True
    assert exp_res.unresolved_reason == "CERTIFICATE_EXPIRED"
    assert "Certificate has EXPIRED" in exp_res.explanation


# ===========================================================================
# 5. FIELD_EQUALS_APPLICATION Rule Tests
# ===========================================================================
def test_field_equals_application_name_matching(db_session: Session, base_fixtures):
    """When institution name appears in document pages, must report PASS."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key8.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-105",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="COMPLETED",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.flush()

    run = ProcessingRun(document_id=doc.id, status="COMPLETED", trigger="UPLOAD")
    db_session.add(run)
    db_session.flush()

    page = DocumentPage(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        clean_text="Certificate awarded to national institute of technology (synthetic) for technical excellence.",
        char_count=100,
        status="SUCCEEDED",
    )
    db_session.add(page)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    name_res = [r for r in res["results"] if r.rule_code == "RULE-CMP-NAME"][0]

    assert name_res.status == "PASS"
    assert name_res.human_review_required is False
    assert "matches application declared value" in name_res.explanation


def test_field_equals_application_numeric_intake_mismatch(db_session: Session, base_fixtures):
    """When declared intake is 120 but document says intake 60, must report FAIL."""
    app = base_fixtures["app"]
    user = base_fixtures["user"]

    doc = Document(
        id=str(uuid.uuid4()),
        application_id=app.id,
        original_filename="accreditation_certificate.pdf",
        storage_key="test/key9.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash-106",
        declared_type="ACCREDITATION_CERTIFICATE",
        processing_status="COMPLETED",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.flush()

    run = ProcessingRun(document_id=doc.id, status="COMPLETED", trigger="UPLOAD")
    db_session.add(run)
    db_session.flush()

    page = DocumentPage(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        text_source="DIGITAL_TEXT",
        clean_text="Computer Science Engineering approved intake: 60 students per annum.",
        char_count=70,
        status="SUCCEEDED",
    )
    db_session.add(page)
    db_session.commit()

    res = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    intake_res = [r for r in res["results"] if r.rule_code == "RULE-CMP-INTAKE"][0]

    assert intake_res.status == "FAIL"
    assert intake_res.human_review_required is True
    assert intake_res.unresolved_reason == "NUMERIC_VALUE_MISMATCH"
    assert "declared value is 120, but document reflects 60" in intake_res.explanation


# ===========================================================================
# 6. Idempotency and Audit Event Tests
# ===========================================================================
def test_validation_idempotency_and_audit(db_session: Session, base_fixtures):
    """Repeated validation runs archive old runs and append audit events."""
    app = base_fixtures["app"]

    # First run
    res1 = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    run_id1 = res1["validation_run_id"]

    # Second run
    res2 = run_application_validation(app.id, db_session, evaluation_date=date(2026, 10, 22))
    run_id2 = res2["validation_run_id"]

    assert run_id1 != run_id2

    # Check database currency
    run1 = db_session.get(ValidationRun, run_id1)
    run2 = db_session.get(ValidationRun, run_id2)
    assert run1.is_current is False
    assert run2.is_current is True

    # Audit events
    audits = list(
        db_session.scalars(
            select(AuditEvent).where(AuditEvent.application_id == app.id).order_by(AuditEvent.occurred_at.asc())
        ).all()
    )
    event_types = [a.event_type for a in audits]
    assert "VALIDATION_INITIATED" in event_types
    assert "VALIDATION_COMPLETED" in event_types


# ===========================================================================
# 7. API Integration Tests
# ===========================================================================
def test_api_list_validation_rules(client: TestClient, base_fixtures):
    """GET /api/v1/validation-rules returns active rules list."""
    response = client.get("/api/v1/validation-rules")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) >= 6
    rule_codes = [r["rule_code"] for r in data]
    assert "RULE-DOC-ACCRED" in rule_codes
    assert "RULE-EXP-ACCRED" in rule_codes


def test_api_trigger_and_get_summary(client: TestClient, base_fixtures):
    """POST /applications/{id}/validate and GET /applications/{id}/validation-summary."""
    app = base_fixtures["app"]

    # Trigger validation
    post_res = client.post(
        f"/api/v1/applications/{app.id}/validate",
        json={"evaluation_date": "2026-10-22"},
    )
    assert post_res.status_code == 200
    summary = post_res.json()["data"]
    assert summary["application_id"] == app.id
    assert summary["status"] == "COMPLETED"
    assert len(summary["results"]) >= 6

    # Get summary
    get_res = client.get(f"/api/v1/applications/{app.id}/validation-summary")
    assert get_res.status_code == 200
    get_summary = get_res.json()["data"]
    assert get_summary["validation_run_id"] == summary["validation_run_id"]
    assert get_summary["total_rules"] == summary["total_rules"]

    # Get results list with filter
    results_res = client.get(f"/api/v1/applications/{app.id}/validation-results?status=FAIL")
    assert results_res.status_code == 200
    fail_results = results_res.json()["data"]
    for r in fail_results:
        assert r["status"] == "FAIL"

    # Get single result detail
    res_id = summary["results"][0]["id"]
    detail_res = client.get(f"/api/v1/validation-results/{res_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["data"]["id"] == res_id


def test_api_nonexistent_application_404(client: TestClient, base_fixtures):
    """Triggering validation on nonexistent application returns 404."""
    fake_id = str(uuid.uuid4())
    res = client.post(f"/api/v1/applications/{fake_id}/validate")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "APPLICATION_NOT_FOUND"
