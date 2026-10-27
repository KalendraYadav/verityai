import io
import tempfile
import pytest
from pathlib import Path
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.document import Document
from app.models.audit import AuditEvent
from app.core.config import settings
from app.core.security import create_access_token
from app.services.storage import resolve_storage_path
from app.core.exceptions import StorageException


@pytest.fixture(autouse=True)
def isolated_storage(monkeypatch):
    """Ensure all test uploads go into an isolated temporary folder."""
    with tempfile.TemporaryDirectory() as tmpdir:
        monkeypatch.setattr(settings, "STORAGE_LOCAL_DIR", tmpdir)
        yield tmpdir


@pytest.fixture
def seeded_application(db_session: Session) -> Application:
    """Seed prerequisite records and return an Application for document tests."""
    inst = Institution(
        id="INST-TEST-01",
        institution_identifier="C-99999",
        institution_name="Test Technical Institute",
        state="Maharashtra",
        city="Pune",
    )
    db_session.add(inst)

    user = User(
        id="USR-TEST-01",
        email="inst@test.invalid",
        display_name="Test Institutional Rep",
        password_hash="fakehash",
        role="INSTITUTION_USER",
        institution_id=inst.id,
    )
    db_session.add(user)

    cat = ApplicationCategory(
        code="EOA_TEST",
        name="Extension of Approval",
        description="Annual approval extension",
    )
    db_session.add(cat)

    app = Application(
        id="APP-TEST-0001",
        application_reference="VERITY-2026-TEST",
        institution_id=inst.id,
        category_code=cat.code,
        academic_year="2026-2027",
        lifecycle_status="DRAFT",
        pipeline_status="NOT_STARTED",
        declared_data={"program": "Engineering"},
        created_by=user.id,
    )
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)
    return app


@pytest.fixture
def auth_headers(seeded_application: Application) -> dict:
    """Generate valid JWT auth header for the seeded institutional user."""
    token = create_access_token(
        subject="USR-TEST-01",
        role="INSTITUTION_USER",
        email="inst@test.invalid",
        extra_claims={"institution_id": seeded_application.institution_id},
    )
    return {"Authorization": f"Bearer {token}"}


def test_upload_pdf_success(client, seeded_application, db_session):
    """Test successful PDF upload returning 202 Accepted and creating records."""
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Size 1 >>\n%%EOF"
    response = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("test_doc.pdf", pdf_content, "application/pdf")},
    )
    assert response.status_code == 202
    res_data = response.json()["data"]
    assert res_data["application_id"] == seeded_application.id
    assert res_data["original_filename"] == "test_doc.pdf"
    assert res_data["media_type"] == "application/pdf"
    assert res_data["upload_status"] == "ACCEPTED"
    assert res_data["processing_status"] == "QUEUED"
    assert res_data["possible_duplicate"] is False
    assert len(res_data["sha256"]) == 64

    # Verify document in DB
    doc_id = res_data["id"]
    doc = db_session.get(Document, doc_id)
    assert doc is not None
    assert doc.original_filename == "test_doc.pdf"
    assert doc.file_state == "PRESENT"
    assert len(doc.processing_runs) == 1
    assert doc.processing_runs[0].status in ("QUEUED", "PROCESSING", "COMPLETED", "MANUAL_REVIEW_REQUIRED")

    # Verify audit event
    audit = db_session.query(AuditEvent).filter(AuditEvent.entity_id == doc_id).first()
    assert audit is not None
    assert audit.event_type == "DOCUMENT_UPLOADED"


def test_upload_png_success(client, seeded_application):
    """Test successful PNG image upload."""
    png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    response = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("seal.png", png_content, "image/png")},
    )
    assert response.status_code == 202
    assert response.json()["data"]["media_type"] == "image/png"


def test_upload_jpeg_success(client, seeded_application):
    """Test successful JPEG image upload."""
    jpeg_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"
    response = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("photo.jpg", jpeg_content, "image/jpeg")},
    )
    assert response.status_code == 202
    assert response.json()["data"]["media_type"] == "image/jpeg"


def test_empty_file_rejected(client, seeded_application, db_session):
    """Test rejection of empty file (422 EMPTY_FILE)."""
    response = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "EMPTY_FILE"

    # Verify FILE_REJECTED audit event
    audit = db_session.query(AuditEvent).filter(AuditEvent.event_type == "FILE_REJECTED").first()
    assert audit is not None


def test_unsupported_extension_rejected(client, seeded_application):
    """Test rejection of unsupported file extensions (e.g., .exe, .sh, .docx)."""
    response = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("malicious.exe", b"MZ\x90\x00", "application/octet-stream")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_extension_content_mismatch_rejected(client, seeded_application):
    """Test rejection when extension claims PDF but content is PNG."""
    png_content = b"\x89PNG\r\n\x1a\nfake content"
    response = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("fake_pdf.pdf", png_content, "application/pdf")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "FILE_TYPE_MISMATCH"


def test_file_too_large_rejected(client, seeded_application, monkeypatch):
    """Test rejection when file size exceeds MAX_UPLOAD_SIZE_BYTES."""
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100)
    oversized = b"%PDF-" + b"0" * 200
    response = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("large.pdf", oversized, "application/pdf")},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_upload_nonexistent_application_rejected(client):
    """Test rejection when application ID does not exist (404)."""
    pdf_content = b"%PDF-1.4\nvalid\n%%EOF"
    response = client.post(
        "/api/v1/applications/NON-EXISTENT-APP/documents",
        files={"file": ("doc.pdf", pdf_content, "application/pdf")},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "APPLICATION_NOT_FOUND"


def test_duplicate_content_detected(client, seeded_application):
    """Test that uploading identical content flags possible_duplicate: true."""
    pdf_content = b"%PDF-1.4\nidentical content for duplicate test\n%%EOF"
    
    # First upload
    res1 = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("first.pdf", pdf_content, "application/pdf")},
    )
    assert res1.status_code == 202
    assert res1.json()["data"]["possible_duplicate"] is False

    # Second upload with same content
    res2 = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("second_copy.pdf", pdf_content, "application/pdf")},
    )
    assert res2.status_code == 202
    assert res2.json()["data"]["possible_duplicate"] is True


def test_list_and_get_document_metadata(client, seeded_application, auth_headers):
    """Test listing documents for an application and retrieving metadata."""
    pdf_content = b"%PDF-1.4\nmetadata test\n%%EOF"
    res_upload = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("meta_doc.pdf", pdf_content, "application/pdf")},
    )
    doc_id = res_upload.json()["data"]["id"]

    # List documents
    res_list = client.get(f"/api/v1/applications/{seeded_application.id}/documents", headers=auth_headers)
    assert res_list.status_code == 200
    items = res_list.json()["data"]
    assert len(items) == 1
    assert items[0]["id"] == doc_id
    assert items[0]["original_filename"] == "meta_doc.pdf"
    # Verify no absolute server paths are exposed
    assert "storage_key" not in items[0]
    assert "path" not in items[0]

    # Get single document metadata
    res_meta = client.get(f"/api/v1/documents/{doc_id}", headers=auth_headers)
    assert res_meta.status_code == 200
    meta = res_meta.json()["data"]
    assert meta["id"] == doc_id
    assert meta["file_state"] == "PRESENT"
    assert "storage_key" not in meta


def test_preview_and_download_document_file(client, seeded_application, auth_headers):
    """Test retrieving stored file bytes with proper security headers."""
    pdf_content = b"%PDF-1.4\nstream content test\n%%EOF"
    res_upload = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("sample.pdf", pdf_content, "application/pdf")},
    )
    doc_id = res_upload.json()["data"]["id"]

    # Preview (inline)
    res_file = client.get(f"/api/v1/documents/{doc_id}/file", headers=auth_headers)
    assert res_file.status_code == 200
    assert res_file.content == pdf_content
    assert res_file.headers["content-type"] == "application/pdf"
    assert "inline" in res_file.headers["content-disposition"]
    assert res_file.headers["x-content-type-options"] == "nosniff"
    assert res_file.headers["cache-control"] == "no-store"

    # Download (attachment)
    res_dl = client.get(f"/api/v1/documents/{doc_id}/file?download=true", headers=auth_headers)
    assert res_dl.status_code == 200
    assert "attachment" in res_dl.headers["content-disposition"]


def test_missing_stored_file_handling(client, seeded_application, db_session, auth_headers):
    """Test graceful handling when DB record exists but filesystem file is missing."""
    pdf_content = b"%PDF-1.4\nwill be deleted from disk\n%%EOF"
    res_upload = client.post(
        f"/api/v1/applications/{seeded_application.id}/documents",
        files={"file": ("deleted_on_disk.pdf", pdf_content, "application/pdf")},
    )
    doc_id = res_upload.json()["data"]["id"]

    # Delete actual file on disk
    doc = db_session.get(Document, doc_id)
    file_path = resolve_storage_path(doc.storage_key)
    file_path.unlink()

    # Requesting the file should return 404 FILE_NOT_FOUND and set file_state to MISSING
    res_file = client.get(f"/api/v1/documents/{doc_id}/file", headers=auth_headers)
    assert res_file.status_code == 404
    assert res_file.json()["error"]["code"] == "FILE_NOT_FOUND"

    db_session.refresh(doc)
    assert doc.file_state == "MISSING"


def test_storage_path_traversal_protection():
    """Verify that path traversal attempts in storage keys are blocked."""
    with pytest.raises(StorageException):
        resolve_storage_path("../../../etc/passwd")

    with pytest.raises(StorageException):
        resolve_storage_path("/absolute/path/attempt")

    with pytest.raises(StorageException):
        resolve_storage_path("APP/DOC/../../secret.txt")
