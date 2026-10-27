import io
import tempfile
import pytest
from PIL import Image, ImageDraw
import pymupdf
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi.testclient import TestClient

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.document import Document
from app.models.processing_run import ProcessingRun
from app.models.document_page import DocumentPage
from app.services.extraction import (
    extract_document_text,
    clean_extracted_text,
    extract_tables_from_page,
    extract_structured_fields_from_tables,
)
from app.services.anomaly import (
    extract_fields_from_document_pages,
    persist_candidate_fields,
)
from app.models.finding import ExtractedField
from app.services.storage import get_storage_root
from app.core.config import settings


def _save_test_file(app_id: str, doc_id: str, filename: str, content: bytes) -> str:
    """Helper to store synthetic test file bytes in isolated storage and return relative storage key."""
    storage_root = get_storage_root()
    dest_dir = storage_root / app_id / doc_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename
    dest_path.write_bytes(content)
    return f"{app_id}/{doc_id}/{filename}"


@pytest.fixture(autouse=True)
def isolated_storage(monkeypatch):
    """Ensure all test uploads go into an isolated temporary folder."""
    with tempfile.TemporaryDirectory() as tmpdir:
        monkeypatch.setattr(settings, "STORAGE_LOCAL_DIR", tmpdir)
        yield tmpdir


@pytest.fixture
def test_setup(db_session: Session):
    """Seed user, institution, category, and application for tests."""
    user = User(
        id="USR-EXTRACT-01",
        email="reviewer@verityai.gov.in",
        display_name="Senior Reviewer",
        password_hash="fakehash",
        role="REVIEWER",
    )
    db_session.add(user)

    inst = Institution(
        id="INST-EXTRACT-01",
        institution_identifier="C-88888",
        institution_name="Government Engineering College",
        state="Karnataka",
        city="Bengaluru",
    )
    db_session.add(inst)

    cat = ApplicationCategory(
        code="EOA_EXTRACT",
        name="Extension of Approval",
        description="Standard approval extension",
    )
    db_session.add(cat)

    app = Application(
        id="APP-EXTRACT-0001",
        application_reference="VERITY-2026-EXTRACT",
        institution_id=inst.id,
        category_code=cat.code,
        academic_year="2026-2027",
        lifecycle_status="DRAFT",
        created_by=user.id,
    )
    db_session.add(app)
    db_session.commit()
    return {"user": user, "institution": inst, "category": cat, "application": app}


def _create_digital_pdf_bytes(text: str) -> bytes:
    """Generate a clean synthetic PDF with digital text."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _create_scanned_pdf_bytes(text: str) -> bytes:
    """Generate a synthetic PDF where the page is an image containing rendered text (no digital text)."""
    img = Image.new("RGB", (800, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 100), text, fill=(0, 0, 0))
    img_buf = io.BytesIO()
    img.save(img_buf, format="PNG")

    doc = pymupdf.open()
    page = doc.new_page(width=800, height=300)
    page.insert_image(page.rect, stream=img_buf.getvalue())
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _create_image_bytes(text: str, fmt: str = "PNG") -> bytes:
    """Generate a standalone synthetic image with text."""
    img = Image.new("RGB", (800, 250), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 80), text, fill=(0, 0, 0))
    img_buf = io.BytesIO()
    img.save(img_buf, format=fmt)
    return img_buf.getvalue()


def test_text_normalization_utility():
    """Verify clean_extracted_text normalizes unicode, whitespace, and hyphens correctly."""
    raw = "All India Council   for \t Technical\r\nEdu-\ncation has approved 100 seats."
    cleaned = clean_extracted_text(raw)
    assert cleaned is not None
    assert "Edu-cation" not in cleaned
    assert "Education" in cleaned
    assert "   " not in cleaned
    assert "All India Council for Technical\nEducation has approved 100 seats." == cleaned


def test_digital_pdf_extraction(db_session: Session, test_setup):
    """Test native digital PDF extraction produces DIGITAL_TEXT with null confidence."""
    text_content = (
        "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION\n"
        "EXTENSION OF APPROVAL NOTIFICATION 2026-2027\n"
        "This is to certify that Government Engineering College has been granted extension of approval for 4 years."
    )
    pdf_bytes = _create_digital_pdf_bytes(text_content)
    storage_key = _save_test_file(
        app_id=test_setup["application"].id,
        doc_id="DOC-DIGITAL-01",
        filename="approval_letter.pdf",
        content=pdf_bytes,
    )

    doc = Document(
        id="DOC-DIGITAL-01",
        application_id=test_setup["application"].id,
        original_filename="approval_letter.pdf",
        storage_key=storage_key,
        media_type="application/pdf",
        file_size_bytes=len(pdf_bytes),
        sha256="fake_sha256_digital",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="QUEUED",
    )
    db_session.add(doc)
    db_session.commit()

    run = extract_document_text(doc.id, db_session)
    assert run is not None
    assert run.status == "COMPLETED"

    db_session.refresh(doc)
    assert doc.processing_status == "COMPLETED"
    assert doc.extraction_quality_band == "GOOD"
    assert doc.page_count == 1

    # Verify DocumentPage
    pages = db_session.scalars(
        select(DocumentPage).where(DocumentPage.document_id == doc.id)
    ).all()
    assert len(pages) == 1
    page = pages[0]
    assert page.page_number == 1
    assert page.text_source == "DIGITAL_TEXT"
    assert page.ocr_mean_confidence is None  # Strictly null for digital text
    assert page.status == "SUCCEEDED"
    assert page.char_count > 50
    assert "ALL INDIA COUNCIL" in (page.clean_text or "")


def test_multi_page_digital_pdf_extraction(db_session: Session, test_setup):
    """Test multi-page digital PDF retains page numbering and order."""
    doc_pdf = pymupdf.open()
    for i in range(1, 4):
        p = doc_pdf.new_page(width=595, height=842)
        p.insert_text(
            (50, 72),
            f"Page {i} of Institutional Documentation for AICTE 2026. Required criteria and facilities details page {i}.",
            fontsize=12,
        )
    multi_bytes = doc_pdf.tobytes()
    doc_pdf.close()

    storage_key = _save_test_file(
        app_id=test_setup["application"].id,
        doc_id="DOC-MULTI-01",
        filename="multi_page.pdf",
        content=multi_bytes,
    )

    doc = Document(
        id="DOC-MULTI-01",
        application_id=test_setup["application"].id,
        original_filename="multi_page.pdf",
        storage_key=storage_key,
        media_type="application/pdf",
        file_size_bytes=len(multi_bytes),
        sha256="fake_sha256_multi",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="QUEUED",
    )
    db_session.add(doc)
    db_session.commit()

    run = extract_document_text(doc.id, db_session)
    assert run is not None
    assert run.status == "COMPLETED"

    pages = db_session.scalars(
        select(DocumentPage).where(DocumentPage.document_id == doc.id).order_by(DocumentPage.page_number)
    ).all()
    assert len(pages) == 3
    for idx, p in enumerate(pages):
        assert p.page_number == idx + 1
        assert p.text_source == "DIGITAL_TEXT"
        assert p.ocr_mean_confidence is None
        assert f"Page {idx + 1}" in (p.clean_text or "")


def test_scanned_pdf_ocr_fallback(db_session: Session, test_setup):
    """Test scanned PDF triggers genuine RapidOCR fallback and computes confidence."""
    scanned_bytes = _create_scanned_pdf_bytes("NBA ACCREDITATION CERTIFICATE 2026")
    storage_key = _save_test_file(
        app_id=test_setup["application"].id,
        doc_id="DOC-SCANNED-01",
        filename="scanned_cert.pdf",
        content=scanned_bytes,
    )

    doc = Document(
        id="DOC-SCANNED-01",
        application_id=test_setup["application"].id,
        original_filename="scanned_cert.pdf",
        storage_key=storage_key,
        media_type="application/pdf",
        file_size_bytes=len(scanned_bytes),
        sha256="fake_sha256_scanned",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="QUEUED",
    )
    db_session.add(doc)
    db_session.commit()

    run = extract_document_text(doc.id, db_session)
    assert run is not None
    assert run.status in ("COMPLETED", "COMPLETED_WITH_WARNINGS")

    pages = db_session.scalars(
        select(DocumentPage).where(DocumentPage.document_id == doc.id)
    ).all()
    assert len(pages) == 1
    page = pages[0]
    assert page.text_source == "OCR"
    assert page.ocr_mean_confidence is not None
    assert 0.0 < page.ocr_mean_confidence <= 1.0
    assert page.char_count > 0
    assert "ACCREDITATION" in (page.clean_text or "").upper() or "CERTIFICATE" in (page.clean_text or "").upper()


def test_image_png_ocr(db_session: Session, test_setup):
    """Test genuine OCR on a PNG image document."""
    png_bytes = _create_image_bytes("AICTE STATE NOC ISSUED 2026", fmt="PNG")
    storage_key = _save_test_file(
        app_id=test_setup["application"].id,
        doc_id="DOC-IMG-01",
        filename="state_noc.png",
        content=png_bytes,
    )

    doc = Document(
        id="DOC-IMG-01",
        application_id=test_setup["application"].id,
        original_filename="state_noc.png",
        storage_key=storage_key,
        media_type="image/png",
        file_size_bytes=len(png_bytes),
        sha256="fake_sha256_img",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="QUEUED",
    )
    db_session.add(doc)
    db_session.commit()

    run = extract_document_text(doc.id, db_session)
    assert run is not None
    assert run.status in ("COMPLETED", "COMPLETED_WITH_WARNINGS")

    pages = db_session.scalars(
        select(DocumentPage).where(DocumentPage.document_id == doc.id)
    ).all()
    assert len(pages) == 1
    page = pages[0]
    assert page.text_source == "OCR"
    assert page.ocr_mean_confidence is not None
    assert 0.0 < page.ocr_mean_confidence <= 1.0
    assert page.char_count > 0


def test_blank_image_no_text_extracted(db_session: Session, test_setup):
    """Test blank image results in MANUAL_REVIEW_REQUIRED and NO_TEXT_EXTRACTED without crashing."""
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    blank_bytes = buf.getvalue()

    storage_key = _save_test_file(
        app_id=test_setup["application"].id,
        doc_id="DOC-BLANK-01",
        filename="blank.png",
        content=blank_bytes,
    )

    doc = Document(
        id="DOC-BLANK-01",
        application_id=test_setup["application"].id,
        original_filename="blank.png",
        storage_key=storage_key,
        media_type="image/png",
        file_size_bytes=len(blank_bytes),
        sha256="fake_sha256_blank",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="QUEUED",
    )
    db_session.add(doc)
    db_session.commit()

    run = extract_document_text(doc.id, db_session)
    assert run is not None
    assert run.status == "MANUAL_REVIEW_REQUIRED"
    assert run.error_code == "NO_TEXT_EXTRACTED"
    assert run.quality_summary["extraction_quality_band"] == "UNUSABLE"

    db_session.refresh(doc)
    assert doc.processing_status == "MANUAL_REVIEW_REQUIRED"
    assert doc.extraction_quality_band == "UNUSABLE"


def test_corrupt_pdf_failure_handling(db_session: Session, test_setup):
    """Test malformed PDF file fails gracefully with FILE_CORRUPTED error code."""
    corrupt_bytes = b"%PDF-1.4\ncorrupted header and broken xref stream\n%%EOF"
    storage_key = _save_test_file(
        app_id=test_setup["application"].id,
        doc_id="DOC-CORRUPT-01",
        filename="broken.pdf",
        content=corrupt_bytes,
    )

    doc = Document(
        id="DOC-CORRUPT-01",
        application_id=test_setup["application"].id,
        original_filename="broken.pdf",
        storage_key=storage_key,
        media_type="application/pdf",
        file_size_bytes=len(corrupt_bytes),
        sha256="fake_sha256_corrupt",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="QUEUED",
    )
    db_session.add(doc)
    db_session.commit()

    run = extract_document_text(doc.id, db_session)
    assert run is not None
    assert run.status == "FAILED"
    assert run.error_code == "FILE_CORRUPTED"

    db_session.refresh(doc)
    assert doc.processing_status == "FAILED"


def test_missing_file_failure_handling(db_session: Session, test_setup):
    """Test missing file on disk marks document as MISSING and FAILED."""
    doc = Document(
        id="DOC-MISSING-01",
        application_id=test_setup["application"].id,
        original_filename="ghost.pdf",
        storage_key="non_existent/path/ghost.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="fake_sha256_missing",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="QUEUED",
    )
    db_session.add(doc)
    db_session.commit()

    run = extract_document_text(doc.id, db_session)
    assert run is not None
    assert run.status == "FAILED"
    assert run.error_code == "FILE_MISSING"

    db_session.refresh(doc)
    assert doc.file_state == "MISSING"
    assert doc.processing_status == "FAILED"


def test_pages_and_processing_api_endpoints(client: TestClient, db_session: Session, test_setup):
    """Test GET /pages, GET /processing, and POST /reprocess via API client."""
    pdf_bytes = _create_digital_pdf_bytes(
        "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION VERIFIED TEST DOCUMENT 2026. "
        "Official institutional approval verification records and page content."
    )
    storage_key = _save_test_file(
        app_id=test_setup["application"].id,
        doc_id="DOC-API-01",
        filename="api_test.pdf",
        content=pdf_bytes,
    )

    doc = Document(
        id="DOC-API-01",
        application_id=test_setup["application"].id,
        original_filename="api_test.pdf",
        storage_key=storage_key,
        media_type="application/pdf",
        file_size_bytes=len(pdf_bytes),
        sha256="fake_sha256_api",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="QUEUED",
    )
    db_session.add(doc)
    db_session.commit()

    # Run extraction
    extract_document_text(doc.id, db_session)

    from app.core.security import create_access_token
    token = create_access_token(test_setup["user"].id, test_setup["user"].role, test_setup["user"].email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"

    # 1. GET /api/v1/documents/{doc_id}/pages
    resp = client.get(f"/api/v1/documents/{doc.id}/pages")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["document_id"] == doc.id
    assert data["page_count"] == 1
    assert len(data["pages"]) == 1
    assert data["pages"][0]["text_source"] == "DIGITAL_TEXT"
    assert "ALL INDIA COUNCIL" in data["pages"][0]["clean_text"]

    # 2. GET /api/v1/documents/{doc_id}/processing
    resp2 = client.get(f"/api/v1/documents/{doc.id}/processing")
    assert resp2.status_code == 200
    pdata = resp2.json()["data"]
    assert pdata["document_id"] == doc.id
    assert pdata["processing_status"] == "COMPLETED"
    assert pdata["current_run"]["status"] == "COMPLETED"
    assert pdata["current_run"]["quality_summary"] is not None

    # 3. POST /api/v1/documents/{doc_id}/reprocess
    resp3 = client.post(f"/api/v1/documents/{doc.id}/reprocess")
    assert resp3.status_code == 202
    rdata = resp3.json()["data"]
    assert rdata["document_id"] == doc.id

    # 4. GET 404 for non-existent document
    resp4 = client.get("/api/v1/documents/DOC-NONEXISTENT/pages")
    assert resp4.status_code == 404
    assert resp4.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"


def test_extract_tables_and_structured_schedule_fields():
    """Verify PyMuPDF table detection and structured field extraction for AICTE schedules."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    # Draw grid table
    y_coords = [100, 125, 150, 175, 200]
    x_coords = [50, 220, 400, 520]
    for y in y_coords:
        page.draw_line(pymupdf.Point(x_coords[0], y), pymupdf.Point(x_coords[-1], y))
    for x in x_coords:
        page.draw_line(pymupdf.Point(x, y_coords[0]), pymupdf.Point(x, y_coords[-1]))

    # Insert cells
    page.insert_text((55, 118), "Facility Type", fontsize=10)
    page.insert_text((225, 118), "Carpet Area (sqm)", fontsize=10)
    page.insert_text((405, 118), "Count", fontsize=10)

    page.insert_text((55, 143), "Administrative Area", fontsize=10)
    page.insert_text((225, 143), "780", fontsize=10)
    page.insert_text((405, 143), "1", fontsize=10)

    page.insert_text((55, 168), "Amenities Area", fontsize=10)
    page.insert_text((225, 168), "520", fontsize=10)
    page.insert_text((405, 168), "1", fontsize=10)

    page.insert_text((55, 193), "Classroom Space", fontsize=10)
    page.insert_text((225, 193), "66", fontsize=10)
    page.insert_text((405, 193), "12", fontsize=10)

    # 1. Test table extraction
    tables = extract_tables_from_page(page)
    assert len(tables) >= 1
    table = tables[0]
    assert table["row_count"] >= 3
    assert "x0" in table["bbox"]
    assert table["bbox"]["x0"] >= 45

    # 2. Test structured field parsing
    fields = extract_structured_fields_from_tables(tables, page_number=1)
    field_map = {f["field_key"]: f for f in fields}

    assert "administrative_area_sqm" in field_map
    assert field_map["administrative_area_sqm"]["raw_value"] == "780.0"
    assert field_map["administrative_area_sqm"]["extraction_method"] == "TABLE_PYMUPDF"
    assert field_map["administrative_area_sqm"]["confidence"] is None  # Strictly null for digital tables
    assert field_map["administrative_area_sqm"]["confidence_basis"] == "DIGITAL_TABLE"
    assert "bounding_box" in field_map["administrative_area_sqm"]["candidate_values"]
    assert "evidence_snippet" in field_map["administrative_area_sqm"]["candidate_values"]

    assert "amenities_area_sqm" in field_map
    assert field_map["amenities_area_sqm"]["raw_value"] == "520.0"

    assert "classroom_carpet_area_sqm" in field_map
    assert field_map["classroom_carpet_area_sqm"]["raw_value"] == "66.0"

    doc.close()


def test_evidence_provenance_and_snippets(db_session: Session, test_setup):
    """Verify that extracted fields retain source document, page, and evidence snippet."""
    text_content = (
        "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION\n"
        "AICTE Approved Intake: 240 seats for 2026-2027\n"
        "AISHE Code: C-12345\n"
        "Total Land Area: 7.50 acres situated at Survey No: 142/B\n"
        "Total Faculty: 24 (Professors: 2, Associate Professors: 6, Assistant Professors: 16)\n"
        "Anti-Ragging Committee constituted and active.\n"
        "EWS Quota: 24 seats allocated."
    )
    doc_record = Document(
        id="DOC-PROV-001",
        application_id=test_setup["application"].id,
        original_filename="institutional_profile.txt",
        storage_key="APP-EXTRACT-0001/DOC-PROV-001/doc.txt",
        media_type="text/plain",
        file_size_bytes=len(text_content),
        sha256="fake_sha256_prov",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="COMPLETED",
    )
    db_session.add(doc_record)
    db_session.flush()

    run = ProcessingRun(
        id="RUN-PROV-001",
        document_id=doc_record.id,
        trigger="TEST",
        status="COMPLETED",
        pipeline_version="1.0.0",
        requested_by=test_setup["user"].id,
    )
    db_session.add(run)
    db_session.flush()

    # Add page
    page = DocumentPage(
        id="PAGE-PROV-001",
        document_id=doc_record.id,
        processing_run_id=run.id,
        page_number=1,
        clean_text=text_content,
        text_source="DIGITAL_TEXT",
        ocr_mean_confidence=None,
        char_count=len(text_content),
    )
    db_session.add(page)
    db_session.flush()

    candidates = extract_fields_from_document_pages(doc_record)
    cand_map = {c["field_key"]: c for c in candidates}

    # Verify intake
    assert "approved_intake" in cand_map
    assert cand_map["approved_intake"]["normalized_value"] == "240"
    assert cand_map["approved_intake"]["confidence"] is None  # Digital text: confidence is None
    assert "240" in (cand_map["approved_intake"]["candidate_values"]["evidence_snippet"] or "")

    # Verify land area and survey number
    assert "land_area_acres" in cand_map
    assert cand_map["land_area_acres"]["normalized_value"] == "7.50"
    assert "survey_plot_number" in cand_map
    assert "142/B" in cand_map["survey_plot_number"]["normalized_value"]

    # Verify faculty counts
    assert "total_faculty_count" in cand_map
    assert cand_map["total_faculty_count"]["normalized_value"] == "24"
    assert "professor_count" in cand_map
    assert cand_map["professor_count"]["normalized_value"] == "2"

    # Verify committee presence
    assert "anti_ragging_committee" in cand_map
    assert cand_map["anti_ragging_committee"]["normalized_value"] == "CONSTITUTED"

    # Persist and check database fields
    persisted = persist_candidate_fields(doc_record, candidates, db_session)
    db_session.commit()
    assert len(persisted) >= 7

    db_fields = db_session.scalars(
        select(ExtractedField).where(ExtractedField.document_id == doc_record.id)
    ).all()
    assert len(db_fields) >= 7
    for f in db_fields:
        assert f.page_number == 1
        assert f.is_current is True
        assert f.candidate_values is not None
        assert "evidence_snippet" in f.candidate_values


def test_ocr_uncertainty_and_confidence_handling(db_session: Session, test_setup):
    """Verify that low OCR confidence (< 0.60) explicitly flags extraction status as LOW_CONFIDENCE."""
    doc_record = Document(
        id="DOC-LOWCONF-001",
        application_id=test_setup["application"].id,
        original_filename="blurred_scan.png",
        storage_key="APP-EXTRACT-0001/DOC-LOWCONF-001/doc.png",
        media_type="image/png",
        file_size_bytes=1000,
        sha256="fake_sha256_ocr",
        uploaded_by=test_setup["user"].id,
        upload_status="ACCEPTED",
        processing_status="COMPLETED",
    )
    db_session.add(doc_record)
    db_session.flush()

    run = ProcessingRun(
        id="RUN-LOWCONF-001",
        document_id=doc_record.id,
        trigger="TEST",
        status="COMPLETED",
        pipeline_version="1.0.0",
        requested_by=test_setup["user"].id,
    )
    db_session.add(run)
    db_session.flush()

    # Low confidence OCR page
    page = DocumentPage(
        id="PAGE-LOWCONF-001",
        document_id=doc_record.id,
        processing_run_id=run.id,
        page_number=1,
        clean_text="Approved Intake: 180 seats",
        text_source="OCR",
        ocr_mean_confidence=0.42,  # Degraded confidence
        char_count=26,
    )
    db_session.add(page)
    db_session.flush()

    candidates = extract_fields_from_document_pages(doc_record)
    cand_map = {c["field_key"]: c for c in candidates}

    assert "approved_intake" in cand_map
    field = cand_map["approved_intake"]
    assert field["confidence"] == 0.42
    assert field["confidence_basis"] == "OCR_PAGE_MEAN"
    assert field["extraction_status"] == "LOW_CONFIDENCE"  # Explicitly flagged, not hidden


def test_structured_table_fallback_when_no_tables():
    """Verify that documents without tables return empty table list without raising exceptions."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((50, 72), "Just ordinary text paragraph without any tabular vectors.", fontsize=12)

    tables = extract_tables_from_page(page)
    assert isinstance(tables, list)
    assert len(tables) == 0

    fields = extract_structured_fields_from_tables(tables, page_number=1)
    assert fields == []
    doc.close()

