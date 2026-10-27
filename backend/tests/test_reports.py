import os
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.validation import ValidationRule, ValidationRun, RuleResult
from app.models.finding import Finding, FindingEvidence
from app.models.report import ScrutinyReport
from app.models.user import User
from app.core.security import hash_password, create_access_token


@pytest.fixture
def base_test_user(client: TestClient, db_session: Session):
    user = User(
        id="usr-rep-reviewer",
        email="reports.officer@verityai.gov.in",
        display_name="Officer Reports",
        password_hash=hash_password("ReportsSecurePass1!"),
        role="REVIEWER",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(user.id, user.role, user.email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"
    return user


def test_review_summary_empty_application(client: TestClient, db_session: Session, base_test_user: User):
    """Test review summary for an application with no runs or documents."""
    inst = Institution(
        id="inst-rep-1",
        institution_name="National Tech Institute",
        institution_identifier="NT-101",
        state="Delhi",
    )
    cat = ApplicationCategory(
        code="CAT_ENG_REP",
        name="Engineering Scrutiny",
        required_document_types=["LAND_TITLE"],
        required_declared_fields=["institution_name"],
        enabled=True,
    )
    app = Application(
        id="app-rep-1",
        application_reference="APP-2026-REP-001",
        institution_id=inst.id,
        category_code=cat.code,
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data={"institution_name": "National Tech Institute"},
        created_by=base_test_user.id,
    )
    db_session.add_all([inst, cat, app])
    db_session.commit()

    resp = client.get("/api/v1/applications/app-rep-1/review-summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["application_id"] == "app-rep-1"
    assert data["application_title"] == "APP-2026-REP-001"
    assert data["institution_name"] == "National Tech Institute"
    assert data["documents_summary"]["total_documents"] == 0
    assert "LAND_TITLE" in data["documents_summary"]["missing_required_types"]
    assert data["validation_summary"]["total_rules"] == 0
    assert data["anomaly_summary"]["total_findings"] == 0
    assert len(data["recommended_actions"]) > 0
    assert "Decision Support Layer" in data["disclaimer"]


def test_review_summary_with_validation_and_anomalies(client: TestClient, db_session: Session, base_test_user: User):
    """Test review summary with full validation results and anomaly findings."""
    inst = Institution(
        id="inst-rep-2",
        institution_name="Apex University",
        institution_identifier="APEX-02",
        state="Punjab",
    )
    cat = ApplicationCategory(
        code="CAT_MGT_REP",
        name="Management Scrutiny",
        required_document_types=[],
        required_declared_fields=[],
        enabled=True,
    )
    app = Application(
        id="app-rep-2",
        application_reference="APP-2026-REP-002",
        institution_id=inst.id,
        category_code=cat.code,
        lifecycle_status="UNDER_SCRUTINY",
        pipeline_status="PROCESSING",
        declared_data={"institution_name": "Apex University"},
        created_by=base_test_user.id,
    )
    doc = Document(
        id="doc-rep-2",
        application_id="app-rep-2",
        original_filename="land_deed.pdf",
        storage_key="key-rep-2",
        storage_backend="LOCAL",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash256rep2_abc123",
        declared_type="LAND_TITLE",
        effective_type="LAND_TITLE",
        processing_status="COMPLETED",
        uploaded_by=base_test_user.id,
    )
    
    val_rule = ValidationRule(
        id="rule-rep-1",
        rule_code="VAL-LAND-AREA",
        rule_name="Land Area Check",
        description="Verify land area matches deed",
        rule_type="DETERMINISTIC",
        category="CONSISTENCY",
        applies_to={},
        parameters={},
        severity="HIGH",
        on_fail_status="FAIL",
        provenance="ILLUSTRATIVE",
        enabled=True,
    )
    from datetime import date
    val_run = ValidationRun(
        id="vrun-rep-1",
        application_id="app-rep-2",
        status="COMPLETED",
        trigger="MANUAL",
        evaluation_date=date.today(),
        is_current=True,
    )
    rule_res = RuleResult(
        id="rres-rep-1",
        validation_run_id="vrun-rep-1",
        application_id="app-rep-2",
        rule_id="rule-rep-1",
        rule_code="VAL-LAND-AREA",
        rule_type="DETERMINISTIC",
        target_key="land_area",
        status="FAIL",
        severity="HIGH",
        explanation="Declared 5.0 acres, extracted 4.2 acres",
        expected_value="5.0 acres",
        observed_value="4.2 acres",
        source_document_id="doc-rep-2",
        source_page_number=1,
        evidence_payload={"page": 1},
        evaluation_date_used=date.today(),
    )

    finding = Finding(
        id="find-rep-1",
        application_id="app-rep-2",
        document_id="doc-rep-2",
        rule_code="ANOM-001",
        finding_key="DOC_CONSISTENCY:land_area",
        category="CONSISTENCY",
        severity="HIGH",
        title="Land Area Mismatch",
        explanation="Declared acreage differs from deed survey",
        review_status="OPEN",
        detection_method="DETERMINISTIC_HEURISTIC",
        recommended_action="Verify surveyor seal",
        is_current=True,
    )
    evidence = FindingEvidence(
        id="fev-rep-1",
        finding_id="find-rep-1",
        sort_order=1,
        evidence_type="DOCUMENT_FIELD",
        label="land_area",
        document_id="doc-rep-2",
        page_number=1,
        raw_value="4.2 acres",
        normalized_value="4.2",
        snapshot={"declared_value": "5.0"},
    )

    db_session.add_all([inst, cat, app, doc, val_rule, val_run, rule_res, finding, evidence])
    db_session.commit()

    resp = client.get("/api/v1/applications/app-rep-2/review-summary")
    assert resp.status_code == 200
    data = resp.json()

    assert data["validation_summary"]["failed"] == 1
    assert len(data["rule_explanations"]) == 1
    assert data["rule_explanations"][0]["rule_code"] == "VAL-LAND-AREA"
    assert data["rule_explanations"][0]["status"] in ("FAILED", "FAIL")
    assert data["anomaly_summary"]["open_findings"] == 1
    assert len(data["anomalies"]) == 1
    assert data["anomalies"][0]["finding_code"] == "ANOM-001"
    assert len(data["anomalies"][0]["evidence"]) == 1
    assert data["anomalies"][0]["evidence"][0]["document_name"] == "land_deed.pdf"

    # Evidence trace endpoint
    ev_resp = client.get("/api/v1/applications/app-rep-2/evidence")
    assert ev_resp.status_code == 200
    ev_data = ev_resp.json()
    assert len(ev_data) >= 1
    assert ev_data[0]["page_number"] == 1
    assert ev_data[0]["field_key"] == "land_area"


def test_pdf_scrutiny_report_generation_and_download(client: TestClient, db_session: Session, base_test_user: User):
    """Test PDF report generation, model persistence, and secure file streaming download."""
    inst = Institution(
        id="inst-rep-3",
        institution_name="Delhi Institute of Technology",
        institution_identifier="DEL-03",
        state="Delhi",
    )
    cat = ApplicationCategory(
        code="CAT_POLY_REP",
        name="Polytechnic Scrutiny",
        required_document_types=[],
        required_declared_fields=[],
        enabled=True,
    )
    app = Application(
        id="app-rep-3",
        application_reference="APP-2026-REP-003",
        institution_id=inst.id,
        category_code=cat.code,
        lifecycle_status="UNDER_SCRUTINY",
        pipeline_status="PROCESSING",
        declared_data={"institution_name": "Delhi Institute of Technology"},
        created_by=base_test_user.id,
    )
    db_session.add_all([inst, cat, app])
    db_session.commit()

    # Generate PDF report
    resp = client.post("/api/v1/applications/app-rep-3/reports", json={"format": "PDF"})
    assert resp.status_code == 200, f"Error response: {resp.json()}"
    rep_data = resp.json()
    assert rep_data["application_id"] == "app-rep-3"
    assert rep_data["format"] == "PDF"
    assert rep_data["file_size_bytes"] > 0
    report_id = rep_data["id"]

    # Verify database model
    report_rec = db_session.query(ScrutinyReport).filter(ScrutinyReport.id == report_id).first()
    assert report_rec is not None
    assert os.path.isfile(report_rec.storage_path)

    # Read first bytes to verify PDF header
    with open(report_rec.storage_path, "rb") as f:
        header = f.read(5)
    assert header == b"%PDF-"

    # List reports endpoint
    list_resp = client.get("/api/v1/applications/app-rep-3/reports")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # Download report endpoint
    dl_resp = client.get(f"/api/v1/reports/{report_id}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/pdf"
    assert "attachment" in dl_resp.headers["content-disposition"]
    assert dl_resp.headers["x-content-type-options"] == "nosniff"
    assert "no-store" in dl_resp.headers["cache-control"]
    assert len(dl_resp.content) == rep_data["file_size_bytes"]


def test_json_scrutiny_report_generation(client: TestClient, db_session: Session, base_test_user: User):
    """Test structured JSON report generation."""
    inst = Institution(
        id="inst-rep-4",
        institution_name="Mumbai Architecture Academy",
        institution_identifier="MUM-04",
        state="Maharashtra",
    )
    cat = ApplicationCategory(
        code="CAT_ARCH_REP",
        name="Architecture Scrutiny",
        required_document_types=[],
        required_declared_fields=[],
        enabled=True,
    )
    app = Application(
        id="app-rep-4",
        application_reference="APP-2026-REP-004",
        institution_id=inst.id,
        category_code=cat.code,
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data={"institution_name": "Mumbai Architecture Academy"},
        created_by=base_test_user.id,
    )
    db_session.add_all([inst, cat, app])
    db_session.commit()

    resp = client.post("/api/v1/applications/app-rep-4/reports", json={"format": "JSON"})
    assert resp.status_code == 200
    rep_data = resp.json()
    assert rep_data["format"] == "JSON"

    report_rec = db_session.query(ScrutinyReport).filter(ScrutinyReport.id == rep_data["id"]).first()
    assert report_rec is not None
    with open(report_rec.storage_path, "r", encoding="utf-8") as f:
        content = json.load(f)
    assert content["application_id"] == "app-rep-4"
    assert "disclaimer" in content


def test_reports_not_found(client: TestClient, base_test_user: User):
    """Test 404 responses for missing applications or reports."""
    resp1 = client.get("/api/v1/applications/non-existent-app/review-summary")
    assert resp1.status_code == 404

    resp2 = client.post("/api/v1/applications/non-existent-app/reports", json={"format": "PDF"})
    assert resp2.status_code == 404

    resp3 = client.get("/api/v1/reports/non-existent-report/download")
    assert resp3.status_code == 404
