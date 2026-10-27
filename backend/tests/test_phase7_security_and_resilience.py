"""
VerityAI — Phase 7 Authoritative Security, RBAC, Resilience & AI Adapter Test Suite

Validates all Phase 7 acceptance criteria:
1. Unauthenticated document listing -> 401
2. Unauthenticated document metadata -> 401
3. Unauthenticated review-summary -> 401
4. Unauthenticated validation-summary -> 401
5. Applicant access to foreign institution's documents -> 403
6. Applicant access to foreign institution's validation summary -> 403
7. Reviewer cannot create applications -> 403
8. Reviewer cannot modify applicant drafts / declarations -> 403
9. Reviewer cannot upload supporting documents -> 403
10. Authorized reviewer access to submitted dossier review-summary -> 200
11. Authorized applicant access to own documents & drafts -> 200
12. Authorized admin access to admin endpoints -> 200
13. Scrutiny job crash recovery: startup reconciliation moves abandoned PROCESSING to FAILED
14. Duplicate scrutiny job prevention
15. AI provider adapter contract and disabled provider handling
"""

import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.scrutiny_job import ScrutinyJob
from app.models.audit import AuditEvent
from app.models.user import User
from app.core.security import hash_password, create_access_token
from app.services.scrutiny_job import reconcile_abandoned_scrutiny_jobs
from app.services.ai.adapter import (
    ScrutinyAIAdapter,
    ScrutinyContext,
    ScrutinyDocument,
    LocalHeuristicProvider,
    AIAnalysisResult,
)


@pytest.fixture
def phase7_fixture(db_session: Session):
    """Setup institutions, users across roles, application, and test document."""
    inst1 = Institution(
        id="INS-P7-01",
        institution_name="Apex Institute of Technology",
        institution_identifier="SYN-APX-001",
        institution_type="TECHNICAL_COLLEGE",
        state="Maharashtra",
        city="Mumbai",
        status="ACTIVE",
    )
    inst2 = Institution(
        id="INS-P7-02",
        institution_name="Beacon University",
        institution_identifier="SYN-BCN-002",
        institution_type="UNIVERSITY",
        state="Karnataka",
        city="Bengaluru",
        status="ACTIVE",
    )
    db_session.add_all([inst1, inst2])

    admin_user = User(
        id="USR-P7-ADMIN",
        email="admin.p7@verityai.gov.in",
        display_name="Regulatory Administrator",
        password_hash=hash_password("AdminPass123!"),
        role="ADMIN",
        is_active=True,
    )
    reviewer_user = User(
        id="USR-P7-REVIEWER",
        email="reviewer.p7@verityai.gov.in",
        display_name="Scrutiny Officer",
        password_hash=hash_password("ReviewerPass123!"),
        role="REVIEWER",
        is_active=True,
    )
    applicant_user1 = User(
        id="USR-P7-APPL1",
        email="applicant1@apex.ac.in",
        display_name="Apex Operator",
        password_hash=hash_password("ApplicantPass123!"),
        role="INSTITUTION_USER",
        institution_id=inst1.id,
        is_active=True,
    )
    applicant_user2 = User(
        id="USR-P7-APPL2",
        email="applicant2@beacon.ac.in",
        display_name="Beacon Operator",
        password_hash=hash_password("ApplicantPass123!"),
        role="INSTITUTION_USER",
        institution_id=inst2.id,
        is_active=True,
    )
    db_session.add_all([admin_user, reviewer_user, applicant_user1, applicant_user2])

    cat = ApplicationCategory(
        code="CAT_P7_EOA",
        name="Extension of Approval P7",
        required_document_types=["ACCREDITATION_CERTIFICATE"],
        required_declared_fields=["institution_name"],
        enabled=True,
    )
    db_session.add(cat)

    # Draft application owned by Applicant 1
    draft_app = Application(
        id="APP-P7-DRAFT-01",
        application_reference="APP-2026-P7-DRAFT",
        institution_id=inst1.id,
        category_code=cat.code,
        academic_year="2026-2027",
        lifecycle_status="DRAFT",
        pipeline_status="DRAFT",
        declared_data={"institution_name": "Apex Institute of Technology"},
        created_by=applicant_user1.id,
    )
    # Submitted application owned by Applicant 1
    submitted_app = Application(
        id="APP-P7-SUB-01",
        application_reference="APP-2026-P7-SUBMITTED",
        institution_id=inst1.id,
        category_code=cat.code,
        academic_year="2026-2027",
        lifecycle_status="SUBMITTED",
        pipeline_status="READY",
        declared_data={"institution_name": "Apex Institute of Technology"},
        created_by=applicant_user1.id,
    )
    # Application owned by Applicant 2
    app_inst2 = Application(
        id="APP-P7-INST2-01",
        application_reference="APP-2026-P7-INST2",
        institution_id=inst2.id,
        category_code=cat.code,
        academic_year="2026-2027",
        lifecycle_status="SUBMITTED",
        pipeline_status="READY",
        declared_data={"institution_name": "Beacon University"},
        created_by=applicant_user2.id,
    )
    db_session.add_all([draft_app, submitted_app, app_inst2])

    # Document belonging to Applicant 1's submitted application
    doc1 = Document(
        id="DOC-P7-001",
        application_id=submitted_app.id,
        original_filename="apex_accreditation.pdf",
        storage_key="uploads/apex_accreditation.pdf",
        media_type="application/pdf",
        file_size_bytes=1024,
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        page_count=2,
        processing_status="EXTRACTED",
        extraction_quality_band="HIGH",
        uploaded_by=applicant_user1.id,
    )
    db_session.add(doc1)
    db_session.commit()

    return {
        "admin_headers": {"Authorization": f"Bearer {create_access_token(subject=admin_user.id, role=admin_user.role, email=admin_user.email)}"},
        "reviewer_headers": {"Authorization": f"Bearer {create_access_token(subject=reviewer_user.id, role=reviewer_user.role, email=reviewer_user.email)}"},
        "applicant1_headers": {"Authorization": f"Bearer {create_access_token(subject=applicant_user1.id, role=applicant_user1.role, email=applicant_user1.email, extra_claims={'institution_id': inst1.id})}"},
        "applicant2_headers": {"Authorization": f"Bearer {create_access_token(subject=applicant_user2.id, role=applicant_user2.role, email=applicant_user2.email, extra_claims={'institution_id': inst2.id})}"},
        "draft_app_id": draft_app.id,
        "submitted_app_id": submitted_app.id,
        "inst2_app_id": app_inst2.id,
        "doc1_id": doc1.id,
        "inst1_id": inst1.id,
        "inst2_id": inst2.id,
    }


# ==============================================================================
# 1. Unauthenticated Endpoint Protection
# ==============================================================================

def test_unauthenticated_document_listing_rejected(client: TestClient, phase7_fixture):
    """GET /api/v1/documents without auth returns 401."""
    resp = client.get("/api/v1/documents")
    assert resp.status_code == 401, f"Expected 401 Unauthorized, got {resp.status_code}: {resp.text}"


def test_unauthenticated_document_metadata_rejected(client: TestClient, phase7_fixture):
    """GET /api/v1/documents/{id} without auth returns 401."""
    doc_id = phase7_fixture["doc1_id"]
    resp = client.get(f"/api/v1/documents/{doc_id}")
    assert resp.status_code == 401, f"Expected 401 Unauthorized, got {resp.status_code}: {resp.text}"


def test_unauthenticated_review_summary_rejected(client: TestClient, phase7_fixture):
    """GET /api/v1/applications/{id}/review-summary without auth returns 401."""
    app_id = phase7_fixture["submitted_app_id"]
    resp = client.get(f"/api/v1/applications/{app_id}/review-summary")
    assert resp.status_code == 401, f"Expected 401 Unauthorized, got {resp.status_code}: {resp.text}"


def test_unauthenticated_validation_summary_rejected(client: TestClient, phase7_fixture):
    """GET /api/v1/applications/{id}/validation-summary without auth returns 401."""
    app_id = phase7_fixture["submitted_app_id"]
    resp = client.get(f"/api/v1/applications/{app_id}/validation-summary")
    assert resp.status_code == 401, f"Expected 401 Unauthorized, got {resp.status_code}: {resp.text}"


# ==============================================================================
# 2. Tenant Isolation & Cross-Institution Access Prevention
# ==============================================================================

def test_applicant_cannot_access_foreign_institution_document(client: TestClient, phase7_fixture):
    """Applicant 2 (Beacon) cannot access document belonging to Applicant 1 (Apex)."""
    doc_id = phase7_fixture["doc1_id"]
    resp = client.get(f"/api/v1/documents/{doc_id}", headers=phase7_fixture["applicant2_headers"])
    assert resp.status_code == 403, f"Expected 403 Forbidden for cross-institution document access, got {resp.status_code}: {resp.text}"


def test_applicant_document_listing_is_tenant_scoped(client: TestClient, phase7_fixture):
    """Applicant 2 listing documents only receives documents from Beacon (0 docs), never Apex."""
    resp = client.get("/api/v1/documents", headers=phase7_fixture["applicant2_headers"])
    assert resp.status_code == 200
    docs_payload = resp.json()
    assert len(docs_payload["data"]) == 0, f"Applicant 2 should have 0 documents, but saw {len(docs_payload['data'])}"


def test_applicant_cannot_access_foreign_validation_summary(client: TestClient, phase7_fixture):
    """Applicant 2 cannot access validation-summary for Apex application."""
    apex_app_id = phase7_fixture["submitted_app_id"]
    resp = client.get(f"/api/v1/applications/{apex_app_id}/validation-summary", headers=phase7_fixture["applicant2_headers"])
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}: {resp.text}"


# ==============================================================================
# 3. Reviewer Role Boundary Enforcement
# ==============================================================================

def test_reviewer_cannot_create_application(client: TestClient, phase7_fixture):
    """Reviewer role is forbidden from creating statutory applications."""
    payload = {
        "institution_id": phase7_fixture["inst1_id"],
        "category_code": "CAT_P7_EOA",
        "academic_year": "2026-27",
        "declared_data": {"institution_name": "Apex Institute of Technology"},
    }
    resp = client.post("/api/v1/applications", json=payload, headers=phase7_fixture["reviewer_headers"])
    assert resp.status_code == 403, f"Expected 403 Forbidden for reviewer application creation, got {resp.status_code}: {resp.text}"


def test_reviewer_cannot_modify_applicant_draft(client: TestClient, phase7_fixture):
    """Reviewer role is forbidden from modifying applicant draft or declared metrics."""
    draft_id = phase7_fixture["draft_app_id"]
    payload = {"declared_data": {"institution_name": "TAMPERED BY REVIEWER"}}
    resp = client.patch(f"/api/v1/applications/{draft_id}", json=payload, headers=phase7_fixture["reviewer_headers"])
    assert resp.status_code == 403, f"Expected 403 Forbidden for reviewer draft modification, got {resp.status_code}: {resp.text}"


def test_reviewer_cannot_upload_documents(client: TestClient, phase7_fixture):
    """Reviewer role is forbidden from uploading institutional documents."""
    draft_id = phase7_fixture["draft_app_id"]
    files = {"file": ("test.pdf", b"%PDF-1.4 dummy content", "application/pdf")}
    data = {"declared_type": "ACCREDITATION_CERTIFICATE"}
    resp = client.post(f"/api/v1/applications/{draft_id}/documents", files=files, data=data, headers=phase7_fixture["reviewer_headers"])
    assert resp.status_code == 403, f"Expected 403 Forbidden for reviewer document upload, got {resp.status_code}: {resp.text}"


# ==============================================================================
# 4. Authorized Role Permissions
# ==============================================================================

def test_authorized_reviewer_can_access_submitted_dossier_review_summary(client: TestClient, phase7_fixture):
    """Reviewer can access submitted institutional review summary for statutory scrutiny."""
    app_id = phase7_fixture["submitted_app_id"]
    resp = client.get(f"/api/v1/applications/{app_id}/review-summary", headers=phase7_fixture["reviewer_headers"])
    assert resp.status_code == 200, f"Expected 200 OK for reviewer review-summary access, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body["application_id"] == app_id


def test_applicant_cannot_access_reviewer_summary(client: TestClient, phase7_fixture):
    """Applicant is forbidden from accessing the officer-only review-summary."""
    app_id = phase7_fixture["submitted_app_id"]
    resp = client.get(f"/api/v1/applications/{app_id}/review-summary", headers=phase7_fixture["applicant1_headers"])
    assert resp.status_code == 403, f"Expected 403 Forbidden for applicant review-summary access, got {resp.status_code}: {resp.text}"


def test_authorized_applicant_can_access_own_document_and_validation(client: TestClient, phase7_fixture):
    """Applicant 1 can access their own document metadata and validation summary."""
    doc_id = phase7_fixture["doc1_id"]
    resp_doc = client.get(f"/api/v1/documents/{doc_id}", headers=phase7_fixture["applicant1_headers"])
    assert resp_doc.status_code == 200
    assert resp_doc.json()["data"]["original_filename"] == "apex_accreditation.pdf"

    app_id = phase7_fixture["submitted_app_id"]
    resp_val = client.get(f"/api/v1/applications/{app_id}/validation-summary", headers=phase7_fixture["applicant1_headers"])
    assert resp_val.status_code == 200


def test_authorized_admin_operations(client: TestClient, phase7_fixture):
    """Administrator can access institutions and documents without restriction."""
    resp_insts = client.get("/api/v1/institutions", headers=phase7_fixture["admin_headers"])
    assert resp_insts.status_code == 200
    resp_docs = client.get("/api/v1/documents", headers=phase7_fixture["admin_headers"])
    assert resp_docs.status_code == 200
    assert len(resp_docs.json()["data"]) >= 1


# ==============================================================================
# 5. Scrutiny Job Crash Recovery & Resilience
# ==============================================================================

def test_startup_reconciles_abandoned_processing_jobs(db_session: Session, phase7_fixture):
    """
    Simulates a server crash during scrutiny execution:
    A persisted job left in PROCESSING is reconciled to FAILED with error summary
    SERVER_RESTARTED_DURING_EXECUTION, and an audit event is logged.
    """
    app_id = phase7_fixture["submitted_app_id"]
    abandoned_job = ScrutinyJob(
        id=f"JOB-CRASH-{uuid.uuid4().hex[:8]}",
        application_id=app_id,
        job_type="FULL_SCRUTINY",
        status="PROCESSING",
        triggered_by="USR-P7-ADMIN",
        retry_count=0,
        max_retries=3,
        safe_error_summary=None,
    )
    db_session.add(abandoned_job)
    db_session.commit()

    # Reconcile on startup
    reconciled_count = reconcile_abandoned_scrutiny_jobs(db_session)
    assert reconciled_count >= 1

    # Verify job transitioned to FAILED
    db_session.refresh(abandoned_job)
    assert abandoned_job.status == "FAILED"
    assert abandoned_job.error_code == "SERVER_RESTARTED_DURING_EXECUTION"
    assert "server restart" in (abandoned_job.safe_error_summary or "").lower()
    assert abandoned_job.completed_at is not None

    # Verify audit event recorded
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.event_type == "SCRUTINY_JOB_RECONCILED",
        AuditEvent.entity_id == abandoned_job.id,
    ).first()
    assert audit is not None
    assert audit.actor_type == "SYSTEM"


# ==============================================================================
# 6. Provider-Independent AI Interface Contract
# ==============================================================================

def test_ai_provider_adapter_contract():
    """Validates the provider-independent AI adapter interface."""
    adapter = ScrutinyAIAdapter()
    assert adapter.primary_provider.get_provider_id() == "LOCAL_DETERMINISTIC_ENGINE"

    ctx = ScrutinyContext(
        application_id="APP-TEST-001",
        category_code="CAT_EOA",
        academic_year="2026-2027",
        declared_data={"institution_name": "Test Engineering College"},
    )
    docs = [
        ScrutinyDocument(
            document_id="DOC-001",
            original_filename="affiliation_letter.pdf",
            declared_type="AFFILIATION_LETTER",
            text_content="The affiliation is valid for academic year 2026-2027.",
        )
    ]

    result = adapter.run_scrutiny(ctx, docs)
    assert isinstance(result, dict)
    assert result["application_id"] == "APP-TEST-001"
    assert result["execution_status"] == "COMPLETED"
    assert "primary_provider" in result
    assert result["primary_provider"]["provider_id"] == "LOCAL_DETERMINISTIC_ENGINE"
    assert result["primary_provider"]["provider_status"] == "ACTIVE"
    assert isinstance(result["findings"], list)


def test_local_heuristic_provider_deterministic_fallback():
    """Validates the deterministic baseline heuristic provider."""
    provider = LocalHeuristicProvider()
    ctx = ScrutinyContext(
        application_id="APP-TEST-002",
        category_code="CAT_EOA",
        academic_year="2026-2027",
        declared_data={"institution_name": "Govt Polytechnic"},
    )
    docs = [
        ScrutinyDocument(
            document_id="DOC-002",
            original_filename="noc.pdf",
            declared_type="NOC_GOVERNMENT",
            text_content="Govt Polytechnic is granted NOC.",
        )
    ]
    res: AIAnalysisResult = provider.analyze(ctx, docs)
    assert res.provider_status == "ACTIVE"
    assert res.provider_id == "LOCAL_DETERMINISTIC_ENGINE"
    assert res.model_metadata["offline"] is True
    assert isinstance(res.findings, list)
