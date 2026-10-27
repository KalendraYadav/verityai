"""
Tests for Phase F: Authorized Verification Adapters and Document Integrity.

Validates:
1. Synthetic vs Official registry providers and explicit labeling.
2. Honest handling of unconfigured external providers (PROVIDER_UNAVAILABLE, not FAIL).
3. SSRF security controls on outbound integration adapters.
4. Digital signature inspection:
   - Detection of PAdES / PKCS#7 byte ranges.
   - Honest labeling of unverified trust chains in prototype environments.
   - Detection of post-signature incremental modifications.
   - Recognition that missing digital signatures on physical scans are not fraud.
5. GET /api/v1/documents/{document_id}/integrity endpoint authorization and responses.
"""

import os
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.document import Document
from app.services.registry import (
    get_registry_provider,
    list_registry_providers,
    verify_application_registry,
)
from app.services.integration import validate_outbound_url
from app.core.exceptions import ValidationException
from app.services.integrity import (
    inspect_pdf_digital_signatures,
    inspect_stored_document_integrity,
)
from app.core.security import create_access_token
from app.core.config import settings
import tempfile


@pytest.fixture(autouse=True)
def isolated_storage(monkeypatch):
    """Ensure all test uploads go into an isolated temporary folder."""
    with tempfile.TemporaryDirectory() as tmpdir:
        monkeypatch.setattr(settings, "STORAGE_LOCAL_DIR", tmpdir)
        yield tmpdir


@pytest.fixture
def f_fixtures(db_session: Session):
    """Seed fixtures for Phase F verification tests."""
    inst1 = Institution(
        id="INST-F-01",
        institution_name="Bharati Technical Institute",
        institution_identifier="AISHE-F-101",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    inst2 = Institution(
        id="INST-F-02",
        institution_name="Sardar Patel Polytechnic",
        institution_identifier="AISHE-F-202",
        institution_type="POLYTECHNIC",
        state="Gujarat",
        city="Surat",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add_all([inst1, inst2])

    user_inst1 = User(
        id="USR-F-INST1",
        email="inst1.officer@verityai.invalid",
        display_name="Inst 1 Officer",
        password_hash="mocked",
        role="INSTITUTION_USER",
        institution_id=inst1.id,
        data_origin="SYNTHETIC_DEMO",
    )
    user_inst2 = User(
        id="USR-F-INST2",
        email="inst2.officer@verityai.invalid",
        display_name="Inst 2 Officer",
        password_hash="mocked",
        role="INSTITUTION_USER",
        institution_id=inst2.id,
        data_origin="SYNTHETIC_DEMO",
    )
    user_reviewer = User(
        id="USR-F-REV",
        email="scrutiny.reviewer@verityai.invalid",
        display_name="Scrutiny Reviewer",
        password_hash="mocked",
        role="REVIEWER",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add_all([user_inst1, user_inst2, user_reviewer])

    cat = ApplicationCategory(
        code="EOA_TECHNICAL",
        name="Extension of Approval",
        description="Statutory category",
        provenance="STATUTORY_APH_2024_27",
        enabled=True,
    )
    db_session.add(cat)

    app1 = Application(
        id="APP-F-01",
        application_reference="APP-REF-F-01",
        institution_id=inst1.id,
        category_code=cat.code,
        academic_year="2025-2026",
        lifecycle_status="DRAFT",
        created_by=user_inst1.id,
        declared_data={"approved_intake": 240},
    )
    db_session.add(app1)
    db_session.commit()

    return {
        "inst1": inst1,
        "inst2": inst2,
        "user_inst1": user_inst1,
        "user_inst2": user_inst2,
        "user_reviewer": user_reviewer,
        "app1": app1,
    }


# ===========================================================================
# 1. Registry Provider Transparency
# ===========================================================================

def test_registry_providers_explicit_synthetic_and_official_distinction():
    """Verify that registry adapters clearly identify synthetic vs unconfigured official stubs."""
    providers = list_registry_providers()
    codes = {p["provider_code"]: p for p in providers}

    assert "SYNTHETIC_AISHE" in codes
    assert "OFFICIAL_AICTE" in codes

    # Synthetic provider claims
    synth = codes["SYNTHETIC_AISHE"]
    assert synth["is_synthetic"] is True
    assert synth["is_available"] is True
    assert synth["status"] == "OPERATIONAL"
    assert "Simulated" in synth["statutory_authority"]

    # Official stub claims
    official = codes["OFFICIAL_AICTE"]
    assert official["is_synthetic"] is False
    assert official["is_available"] is False
    assert official["status"] == "NOT_CONFIGURED"
    assert "requires production credentials" in official["description"].lower()


def test_unconfigured_official_provider_returns_honest_unavailable_state(db_session: Session, f_fixtures):
    """Triggering verification against unconfigured provider records PROVIDER_UNAVAILABLE, not false failure."""
    app1 = f_fixtures["app1"]
    run = verify_application_registry(db_session, app1.id, provider_code="OFFICIAL_AICTE")

    assert run.overall_status == "PROVIDER_UNAVAILABLE"
    assert "not configured or unavailable" in run.summary
    assert len(run.results) == 0  # No fabricated check results


# ===========================================================================
# 2. SSRF Protection on External Integrations
# ===========================================================================

def test_ssrf_validator_blocks_private_and_metadata_destinations():
    """SSRF policy prevents external adapters from contacting loopback, internal CIDRs, or metadata services."""
    # Localhost
    with pytest.raises(ValidationException) as exc:
        validate_outbound_url("http://localhost:8080/api")
    assert "HTTPS" in str(exc.value.message) or "SSRF" in str(exc.value.code)

    # Cloud metadata IP
    with pytest.raises(ValidationException):
        validate_outbound_url("https://169.254.169.254/computeMetadata/v1")

    # Private RFC 1918 range
    with pytest.raises(ValidationException):
        validate_outbound_url("https://10.0.0.1/admin")


# ===========================================================================
# 3. Digital Signature Inspection & Document Integrity
# ===========================================================================

def test_digital_signature_inspection_unsigned_pdf():
    """Unsigned PDF correctly reports NO_CRYPTOGRAPHIC_SIGNATURE with note on physical ink signatures."""
    # Minimal synthetic PDF bytes
    raw_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF"
    report = inspect_pdf_digital_signatures(raw_pdf)

    assert report["signature_present"] is False
    assert report["signature_count"] == 0
    assert report["integrity_status"] == "NO_CRYPTOGRAPHIC_SIGNATURE"
    assert "visual inspection of ink signatures" in report["explanation"]


def test_digital_signature_inspection_signed_pdf_unverified_trust():
    """PDF with digital signature detects byte range and marks trust chain as unverified prototype environment."""
    # Construct synthetic PDF with valid /ByteRange structure and /Sig dictionary
    sig_content = b"<0123456789ABCDEF>"
    part1 = b"%PDF-1.4\n1 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /Name (Er. Rajesh Sharma, CoA CA/2012/55412) /M (D:20261024103000Z) /ByteRange [ 0 200 250 150 ] /Contents "
    # Pad part1 so length is exactly 200
    part1 = part1.ljust(200, b" ")
    # Part 2 is the signature content (length 50, from 200 to 250)
    part2 = sig_content.ljust(50, b" ")
    # Part 3 is the remainder of the file (from 250 for 150 bytes, total 400 bytes)
    part3 = b"\n>>\nendobj\nxref\ntrailer\n<< /Root 1 0 R >>\nstartxref\n350\n%%EOF".ljust(150, b" ")

    synthetic_signed_pdf = part1 + part2 + part3
    assert len(synthetic_signed_pdf) == 400

    report = inspect_pdf_digital_signatures(synthetic_signed_pdf)

    assert report["signature_present"] is True
    assert report["signature_count"] == 1
    sig = report["signatures"][0]
    assert sig["format_subfilter"] == "adbe.pkcs7.detached"
    assert "Rajesh Sharma" in (sig["declared_signer"] or "")
    assert sig["signing_time"] == "2026-10-24T10:30:00Z"
    assert sig["coverage_status"] == "COVERS_FULL_DOCUMENT"
    assert sig["certificate_chain_verified"] is False
    assert report["integrity_status"] == "DIGITAL_SIGNATURE_PRESENT_UNVERIFIED_TRUST"
    assert "Root CA / CCA India trust chain verification is not configured" in sig["trust_verification_note"]


def test_digital_signature_inspection_detects_post_signing_alterations():
    """PDF with bytes appended after signed byte range reports INCREMENTAL_DATA_APPENDED."""
    part1 = b"%PDF-1.4\n1 0 obj\n<< /Type /Sig /ByteRange [ 0 100 150 100 ] ".ljust(100, b" ")
    part2 = b"<SIGNATURE_BYTES>".ljust(50, b" ")
    part3 = b"\n>>\nendobj\n%%EOF".ljust(100, b" ")
    appended_data = b"\n% MALICIOUS_OR_UNAUTHORIZED_APPENDED_CONTENT\n"

    tampered_pdf = part1 + part2 + part3 + appended_data

    report = inspect_pdf_digital_signatures(tampered_pdf)

    assert report["signature_present"] is True
    assert report["integrity_status"] == "INCREMENTAL_DATA_APPENDED"
    assert report["signatures"][0]["coverage_status"] == "INCREMENTAL_UPDATE_AFTER_SIGNATURE"
    assert report["signatures"][0]["post_signature_bytes"] == len(appended_data)
    assert "additional data was appended to the file after signing" in report["explanation"]


# ===========================================================================
# 4. Document Integrity API & Tenant Isolation
# ===========================================================================

def test_document_integrity_api_tenant_authorization(client: TestClient, db_session: Session, f_fixtures):
    """Document integrity endpoint allows owner and reviewer, but rejects cross-institution user."""
    app1 = f_fixtures["app1"]
    user_inst1 = f_fixtures["user_inst1"]
    user_inst2 = f_fixtures["user_inst2"]
    user_reviewer = f_fixtures["user_reviewer"]

    # 1. Institution 1 uploads document
    token1 = create_access_token(user_inst1.id, user_inst1.role, user_inst1.institution_id)
    pdf_content = b"%PDF-1.4\nPhysical certificate test.\n%%EOF"
    upload_resp = client.post(
        f"/api/v1/applications/{app1.id}/documents",
        files={"file": ("land_deed.pdf", pdf_content, "application/pdf")},
        cookies={"access_token": token1},
    )
    assert upload_resp.status_code == 202
    doc_id = upload_resp.json()["data"]["id"]

    # 2. Institution 1 user (owner) -> 200 OK
    resp1 = client.get(f"/api/v1/documents/{doc_id}/integrity", cookies={"access_token": token1})
    assert resp1.status_code == 200
    data1 = resp1.json()["data"]
    assert data1["sha256_match"] is True
    assert data1["signature_report"]["signature_present"] is False
    assert "visual inspection of ink signatures" in data1["signature_report"]["explanation"]

    # 3. Reviewer -> 200 OK
    token_rev = create_access_token(user_reviewer.id, user_reviewer.role, None)
    resp_rev = client.get(f"/api/v1/documents/{doc_id}/integrity", cookies={"access_token": token_rev})
    assert resp_rev.status_code == 200

    # 4. Institution 2 user (cross-institution) -> 403 Forbidden
    token2 = create_access_token(user_inst2.id, user_inst2.role, user_inst2.institution_id)
    resp2 = client.get(f"/api/v1/documents/{doc_id}/integrity", cookies={"access_token": token2})
    assert resp2.status_code == 403
    err_body = resp2.json().get("error", resp2.json().get("detail", {}))
    assert err_body.get("code") == "FORBIDDEN"


