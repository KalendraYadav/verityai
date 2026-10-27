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
from app.models.processing_run import ProcessingRun
from app.models.document_page import DocumentPage
from app.models.finding import Finding, ExtractedField, FindingEvidence
from app.services.anomaly import (
    run_application_analysis,
    extract_fields_from_document_pages,
    persist_candidate_fields,
    review_finding,
)


def _add_page(
    db: Session,
    doc: Document,
    page_num: int,
    text: str,
    conf: float = 0.95,
    text_source: str = "DIRECT_EXTRACTION",
) -> DocumentPage:
    """Helper to attach a page and processing run to a document."""
    run = db.scalars(select(ProcessingRun).where(ProcessingRun.document_id == doc.id)).first()
    if not run:
        run = ProcessingRun(
            id=str(uuid.uuid4()),
            document_id=doc.id,
            status="COMPLETED",
            pipeline_version="1.0.0",
        )
        db.add(run)
        db.flush()

    page = DocumentPage(
        id=str(uuid.uuid4()),
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=page_num,
        clean_text=text,
        text_source=text_source,
        ocr_mean_confidence=conf,
        char_count=len(text),
    )
    db.add(page)
    db.flush()
    return page


@pytest.fixture
def anomaly_fixtures(db_session: Session):
    """Seed test fixtures for anomaly detection."""
    inst = Institution(
        id="INST-ANOM-01",
        institution_name="Apex Institute of Technology",
        institution_identifier="SYN-APX-001",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(inst)

    user = User(
        id="USR-REV-01",
        email="scrutiny.officer@demo.verityai.invalid",
        display_name="Scrutiny Officer One",
        password_hash="mocked",
        role="REVIEWER",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(user)

    cat = ApplicationCategory(
        code="ANOM_EOA",
        name="Extension of Approval",
        description="Demo category for anomaly checks",
        required_document_types=["ACCREDITATION_CERTIFICATE", "APPROVAL_LETTER"],
        required_declared_fields=["institution_name", "approved_intake"],
        provenance="ILLUSTRATIVE",
        enabled=True,
    )
    db_session.add(cat)

    app = Application(
        id="APP-ANOM-01",
        application_reference="APP-REF-ANOM-01",
        institution_id=inst.id,
        category_code=cat.code,
        academic_year="2025-2026",
        declared_data={
            "institution_name": "Apex Institute of Technology",
            "approved_intake": 480,
            "principal_name": "Dr. A. Sharma",
        },
        lifecycle_status="SUBMITTED",
        pipeline_status="READY",
        created_by=user.id,
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(app)
    db_session.commit()

    return {
        "institution": inst,
        "user": user,
        "category": cat,
        "application": app,
    }


def test_candidate_field_extraction(db_session: Session, anomaly_fixtures):
    """Verify regex-based candidate extraction discovers key regulatory fields with page provenance."""
    app = anomaly_fixtures["application"]
    user = anomaly_fixtures["user"]
    doc = Document(
        id="DOC-EXT-01",
        application_id=app.id,
        declared_type="ACCREDITATION_CERTIFICATE",
        effective_type="ACCREDITATION_CERTIFICATE",
        original_filename="accreditation_cert.pdf",
        storage_key="test/doc_ext_01.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="hash123",
        uploaded_by=user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=2,
    )
    db_session.add(doc)
    db_session.flush()

    _add_page(
        db_session,
        doc,
        page_num=1,
        text=(
            "NATIONAL BOARD OF ACCREDITATION\n"
            "Certificate No: NBA/ENGG/2024/9876\n"
            "This is to certify that Apex Institute of Technology has been accredited.\n"
            "Approved Intake: 480 students.\n"
            "Academic Year: 2025-2026\n"
        ),
        conf=0.98,
    )
    _add_page(
        db_session,
        doc,
        page_num=2,
        text="Date of Issue: 15/06/2024\nValid Until: 30/06/2027\n",
        conf=0.95,
    )
    db_session.commit()
    db_session.refresh(doc)

    candidates = extract_fields_from_document_pages(doc)
    candidate_keys = {c["field_key"]: c for c in candidates}

    assert "certificate_number" in candidate_keys
    assert candidate_keys["certificate_number"]["raw_value"] == "NBA/ENGG/2024/9876"
    assert candidate_keys["certificate_number"]["page_number"] == 1

    assert "approved_intake" in candidate_keys
    assert candidate_keys["approved_intake"]["normalized_value"] == "480"

    assert "academic_year" in candidate_keys
    assert candidate_keys["academic_year"]["normalized_value"] == "2025-2026"

    assert "issue_date" in candidate_keys
    assert candidate_keys["issue_date"]["normalized_value"] == "2024-06-15"
    assert candidate_keys["issue_date"]["page_number"] == 2

    assert "expiry_date" in candidate_keys
    assert candidate_keys["expiry_date"]["normalized_value"] == "2027-06-30"

    # Persist and check versioning
    persisted = persist_candidate_fields(doc, candidates, db_session)
    assert len(persisted) >= 5
    for pf in persisted:
        assert pf.document_id == doc.id
        assert pf.is_current is True
        assert pf.field_version == 1


def test_cross_document_name_and_intake_anomalies(db_session: Session, anomaly_fixtures):
    """Verify cross-document checks detect institution name conflict and intake mismatch."""
    app = anomaly_fixtures["application"]
    user = anomaly_fixtures["user"]

    # Doc 1: Approval Letter
    doc1 = Document(
        id="DOC-ANM-D1",
        application_id=app.id,
        declared_type="APPROVAL_LETTER",
        effective_type="APPROVAL_LETTER",
        original_filename="aiicte_eoa_letter.pdf",
        storage_key="test/mock1.pdf",
        media_type="application/pdf",
        file_size_bytes=2048,
        sha256="sha_unique_1111",
        uploaded_by=user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=1,
    )
    db_session.add(doc1)
    db_session.flush()

    _add_page(
        db_session,
        doc1,
        page_num=1,
        text=(
            "APPROVAL LETTER\n"
            "Apex Institute of Technology\n"
            "Approved Intake: 480 Seats\n"
        ),
        conf=0.99,
    )

    # Doc 2: Accreditation Certificate with conflicting institution name and conflicting intake
    doc2 = Document(
        id="DOC-ANM-D2",
        application_id=app.id,
        declared_type="ACCREDITATION_CERTIFICATE",
        effective_type="ACCREDITATION_CERTIFICATE",
        original_filename="conflicting_cert.pdf",
        storage_key="test/mock2.pdf",
        media_type="application/pdf",
        file_size_bytes=2048,
        sha256="sha_unique_2222",
        uploaded_by=user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=1,
    )
    db_session.add(doc2)
    db_session.flush()

    _add_page(
        db_session,
        doc2,
        page_num=1,
        text=(
            "ACCREDITATION CERTIFICATE\n"
            "Apex College of Polytechnic\n"  # Name mismatch
            "Approved Intake: 300 Seats\n"     # Intake mismatch (480 vs 300)
        ),
        conf=0.98,
    )
    db_session.commit()

    # Run analysis
    res = run_application_analysis(app.id, db_session)
    assert res["total_anomalies"] >= 2

    rule_codes = {f.rule_code: f for f in res["findings"]}
    assert "ANM-XDOC-NAME" in rule_codes
    name_finding = rule_codes["ANM-XDOC-NAME"]
    assert name_finding.severity == "HIGH"
    assert name_finding.requires_human_review is True
    assert len(name_finding.evidence_items) == 2

    assert "ANM-XDOC-INTAKE" in rule_codes
    intake_finding = rule_codes["ANM-XDOC-INTAKE"]
    assert intake_finding.severity == "HIGH"
    assert intake_finding.expected_value == "480"
    assert intake_finding.observed_value == "300"
    assert len(intake_finding.evidence_items) == 2


def test_date_sanity_and_duplicate_file_anomalies(db_session: Session, anomaly_fixtures):
    """Verify inverted dates and duplicate SHA-256 upload detection."""
    app = anomaly_fixtures["application"]
    user = anomaly_fixtures["user"]

    # Doc 1: Inverted dates (Expiry before Issue date)
    doc1 = Document(
        id="DOC-DATE-01",
        application_id=app.id,
        declared_type="AFFILIATION_CERTIFICATE",
        effective_type="AFFILIATION_CERTIFICATE",
        original_filename="inverted_dates.pdf",
        storage_key="test/mock_inv.pdf",
        media_type="application/pdf",
        file_size_bytes=1000,
        sha256="sha_duplicate_common",
        uploaded_by=user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=1,
    )
    db_session.add(doc1)
    db_session.flush()

    _add_page(
        db_session,
        doc1,
        page_num=1,
        text="Issue Date: 2026-10-01\nValid Until / Expiry Date: 2024-05-01\n",
        conf=0.96,
    )

    # Doc 2: Uploaded under a different name but exact same SHA-256 hash
    doc2 = Document(
        id="DOC-DUP-02",
        application_id=app.id,
        declared_type="LAND_USE_CERTIFICATE",
        effective_type="LAND_USE_CERTIFICATE",
        original_filename="re_uploaded_copy.pdf",
        storage_key="test/mock_dup.pdf",
        media_type="application/pdf",
        file_size_bytes=1000,
        sha256="sha_duplicate_common",  # exact match
        uploaded_by=user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=1,
    )
    db_session.add(doc2)
    db_session.flush()

    _add_page(
        db_session,
        doc2,
        page_num=1,
        text="Land Use Registration Copy\n",
        conf=0.95,
    )
    db_session.commit()

    res = run_application_analysis(app.id, db_session)
    rule_codes = {f.rule_code: f for f in res["findings"]}

    # Check Date Inversion
    assert "ANM-DATE-SANITY" in rule_codes
    date_finding = rule_codes["ANM-DATE-SANITY"]
    assert "after the expiry date" in date_finding.explanation.lower()
    assert len(date_finding.evidence_items) == 2

    # Check Duplicate File
    assert "ANM-DUPLICATE-FILE" in rule_codes
    dup_finding = rule_codes["ANM-DUPLICATE-FILE"]
    assert dup_finding.severity == "HIGH"
    assert len(dup_finding.evidence_items) == 2


def test_degraded_ocr_extraction_quality_anomaly(db_session: Session, anomaly_fixtures):
    """Verify document with poor OCR quality raises an ANM-EXTRACTION-QUALITY finding."""
    app = anomaly_fixtures["application"]
    user = anomaly_fixtures["user"]

    doc = Document(
        id="DOC-POOR-01",
        application_id=app.id,
        declared_type="OTHER_SUPPORTING",
        effective_type="OTHER_SUPPORTING",
        original_filename="blurry_scan.pdf",
        storage_key="test/blurry.pdf",
        media_type="application/pdf",
        file_size_bytes=5000,
        sha256="sha_poor_9999",
        uploaded_by=user.id,
        processing_status="MANUAL_REVIEW_REQUIRED",
        extraction_quality_band="POOR",
        page_count=1,
    )
    db_session.add(doc)
    db_session.flush()

    _add_page(
        db_session,
        doc,
        page_num=1,
        text="?? %%% unintelligible ...",
        conf=0.32,
        text_source="RAPID_OCR",
    )
    db_session.commit()

    res = run_application_analysis(app.id, db_session)
    rule_codes = {f.rule_code: f for f in res["findings"]}

    assert "ANM-EXTRACTION-QUALITY" in rule_codes
    qual_finding = rule_codes["ANM-EXTRACTION-QUALITY"]
    assert qual_finding.severity == "MEDIUM"
    assert qual_finding.requires_human_review is True


def test_reviewer_workflow_and_carry_over(db_session: Session, anomaly_fixtures):
    """Test human reviewer can update finding status and re-running analysis preserves review state."""
    app = anomaly_fixtures["application"]
    user = anomaly_fixtures["user"]

    doc1 = Document(
        id="DOC-RV-01",
        application_id=app.id,
        declared_type="ACCREDITATION_CERTIFICATE",
        effective_type="ACCREDITATION_CERTIFICATE",
        original_filename="doc1.pdf",
        storage_key="test/doc1.pdf",
        media_type="application/pdf",
        file_size_bytes=100,
        sha256="hash_rv_common",
        uploaded_by=user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=1,
    )
    doc2 = Document(
        id="DOC-RV-02",
        application_id=app.id,
        declared_type="APPROVAL_LETTER",
        effective_type="APPROVAL_LETTER",
        original_filename="doc2.pdf",
        storage_key="test/doc2.pdf",
        media_type="application/pdf",
        file_size_bytes=100,
        sha256="hash_rv_common",
        uploaded_by=user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=1,
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    # Initial run generates ANM-DUPLICATE-FILE
    res1 = run_application_analysis(app.id, db_session)
    dup_finding = next(f for f in res1["findings"] if f.rule_code == "ANM-DUPLICATE-FILE")
    assert dup_finding.review_status == "OPEN"

    # Reviewer confirms finding with comment
    reviewed = review_finding(
        finding_id=dup_finding.id,
        review_status="CONFIRMED",
        comment="Applicant confirmed identical file uploaded twice by mistake.",
        reviewer_id=user.id,
        db=db_session,
    )
    assert reviewed.review_status == "CONFIRMED"
    assert reviewed.review_comment == "Applicant confirmed identical file uploaded twice by mistake."
    assert reviewed.reviewed_by == user.id

    # Re-running analysis should preserve CONFIRMED review status via carry-over
    res2 = run_application_analysis(app.id, db_session)
    re_finding = next(f for f in res2["findings"] if f.rule_code == "ANM-DUPLICATE-FILE")
    assert re_finding.review_status == "CONFIRMED"
    assert re_finding.review_comment == "Applicant confirmed identical file uploaded twice by mistake."
    assert re_finding.carried_over_from_finding_id == dup_finding.id


def test_anomaly_api_endpoints(client: TestClient, db_session: Session, anomaly_fixtures):
    """Test REST API endpoints for triggering analysis, fetching anomalies, reviewing, and candidate fields."""
    app = anomaly_fixtures["application"]
    user = anomaly_fixtures["user"]

    doc = Document(
        id="DOC-API-01",
        application_id=app.id,
        declared_type="ACCREDITATION_CERTIFICATE",
        effective_type="ACCREDITATION_CERTIFICATE",
        original_filename="nba_cert.pdf",
        storage_key="test/nba.pdf",
        media_type="application/pdf",
        file_size_bytes=500,
        sha256="sha_api_123",
        uploaded_by=user.id,
        processing_status="EXTRACTED",
        extraction_quality_band="GOOD",
        page_count=1,
    )
    db_session.add(doc)
    db_session.flush()

    _add_page(
        db_session,
        doc,
        page_num=1,
        text="Certificate No: NBA/ENGG/2025/1111\nApproved Intake: 480\n",
        conf=0.97,
    )
    from app.core.security import create_access_token
    token = create_access_token(user.id, user.role, user.email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"

    # 1. Trigger analysis via API
    resp = client.post(f"/api/v1/applications/{app.id}/analyze")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["application_id"] == app.id
    assert "total_anomalies" in data
    assert "extracted_fields" in data
    assert len(data["extracted_fields"]) >= 2

    # 2. Get Analysis Summary
    resp2 = client.get(f"/api/v1/applications/{app.id}/analysis")
    assert resp2.status_code == 200
    assert resp2.json()["data"]["application_id"] == app.id

    # 3. Get Extracted Candidate Fields
    resp3 = client.get(f"/api/v1/applications/{app.id}/extracted-fields")
    assert resp3.status_code == 200
    fields = resp3.json()["data"]
    assert any(f["field_key"] == "certificate_number" for f in fields)
    assert any(f["field_key"] == "approved_intake" for f in fields)

    # 4. List Anomalies
    resp4 = client.get(f"/api/v1/applications/{app.id}/anomalies")
    assert resp4.status_code == 200

    # 5. Seed an anomaly directly to test Review endpoint
    finding = Finding(
        id="FND-API-TEST-01",
        application_id=app.id,
        rule_code="ANM-XDOC-NAME",
        rule_version="1.0",
        finding_type="CROSS_DOC_CONFLICT",
        category="IDENTITY_VERIFICATION",
        finding_key="test_key_api",
        result_status="NEEDS_REVIEW",
        severity="HIGH",
        title="Discrepancy in Name",
        explanation="Test explanation",
        recommended_action="Review",
        requires_human_review=True,
        review_status="OPEN",
        is_current=True,
        detection_method="DETERMINISTIC_HEURISTIC",
    )
    ev = FindingEvidence(
        id=str(uuid.uuid4()),
        finding_id=finding.id,
        sort_order=1,
        evidence_type="DOCUMENT_FIELD",
        label="Evidence 1",
        raw_value="Val",
    )
    db_session.add_all([finding, ev])
    db_session.commit()

    # 6. Get Single Finding
    resp5 = client.get(f"/api/v1/anomalies/{finding.id}")
    assert resp5.status_code == 200
    f_data = resp5.json()["data"]
    assert f_data["id"] == finding.id
    assert len(f_data["evidence_items"]) == 1

    # 7. Review Finding
    resp6 = client.post(
        f"/api/v1/anomalies/{finding.id}/review",
        json={
            "review_status": "DISMISSED",
            "comment": "False positive, legal variation in name approved.",
            "reviewer_id": user.id,
        },
    )
    assert resp6.status_code == 200
    assert resp6.json()["data"]["review_status"] == "DISMISSED"
    assert resp6.json()["data"]["review_comment"] == "False positive, legal variation in name approved."
