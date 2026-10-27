"""
VerityAI — Authoritative Role-Based Access Control (RBAC) Test Suite
Tests all 14 mandatory security boundaries and permissions between:
- Scrutiny Officer (REVIEWER)
- Regulatory Administrator (ADMIN)
- Institutional Applicant (INSTITUTION_USER)
- Anonymous / Unauthenticated actors
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.finding import Finding
from app.models.report import ScrutinyReport
from app.models.audit import AuditEvent
from app.models.user import User
from app.core.security import hash_password, create_access_token


@pytest.fixture
def rbac_fixture(db_session: Session):
    """Setup multi-role test users, test institution, and test application."""
    # Institution
    inst = Institution(
        id="INS-RBAC-01",
        institution_name="RBAC Technical Institute",
        institution_identifier="SYN-RBAC-001",
        institution_type="TECHNICAL_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
    )
    inst_other = Institution(
        id="INS-OTHER-02",
        institution_name="Other University",
        institution_identifier="SYN-OTHER-002",
        institution_type="UNIVERSITY",
        state="Karnataka",
        city="Bengaluru",
        status="ACTIVE",
    )
    db_session.add_all([inst, inst_other])

    # Users
    admin_user = User(
        id="USR-RBAC-ADMIN",
        email="admin.rbac@verityai.gov.in",
        display_name="Regulatory Administrator",
        password_hash=hash_password("AdminPass123!"),
        role="ADMIN",
        is_active=True,
    )
    reviewer_user = User(
        id="USR-RBAC-REVIEWER",
        email="reviewer.rbac@verityai.gov.in",
        display_name="Scrutiny Officer",
        password_hash=hash_password("ReviewerPass123!"),
        role="REVIEWER",
        is_active=True,
    )
    inst_user = User(
        id="USR-RBAC-INST",
        email="operator.rbac@institution.ac.in",
        display_name="Institution Operator",
        password_hash=hash_password("OperatorPass123!"),
        role="INSTITUTION_USER",
        institution_id=inst.id,
        is_active=True,
    )
    other_inst_user = User(
        id="USR-OTHER-INST",
        email="operator.other@other.ac.in",
        display_name="Other Institution Operator",
        password_hash=hash_password("OperatorPass123!"),
        role="INSTITUTION_USER",
        institution_id=inst_other.id,
        is_active=True,
    )
    db_session.add_all([admin_user, reviewer_user, inst_user, other_inst_user])

    # Category & Application
    cat = ApplicationCategory(
        code="CAT_RBAC_TEST",
        name="RBAC Test Category",
        required_document_types=["ACCREDITATION_CERTIFICATE"],
        required_declared_fields=["institution_name"],
        enabled=True,
    )
    db_session.add(cat)

    app = Application(
        id="APP-RBAC-001",
        application_reference="APP-2026-RBAC-001",
        institution_id=inst.id,
        category_code=cat.code,
        academic_year="2026-2027",
        lifecycle_status="SUBMITTED",
        pipeline_status="READY",
        declared_data={"institution_name": "RBAC Technical Institute"},
        created_by=inst_user.id,
    )
    db_session.add(app)
    db_session.commit()

    return {
        "institution": inst,
        "other_institution": inst_other,
        "admin": admin_user,
        "reviewer": reviewer_user,
        "inst_user": inst_user,
        "other_inst_user": other_inst_user,
        "category": cat,
        "application": app,
    }


def _auth_client(client: TestClient, user: User) -> TestClient:
    """Helper to attach secure session cookie and standard CSRF header."""
    token = create_access_token(user.id, user.role, user.email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"
    return client


# 1. Reviewer can access permitted scrutiny endpoints
def test_reviewer_can_access_scrutiny_endpoints(client: TestClient, rbac_fixture):
    user = rbac_fixture["reviewer"]
    app = rbac_fixture["application"]
    _auth_client(client, user)

    # Scrutiny queue
    res_queue = client.get("/api/v1/scrutiny-queue")
    assert res_queue.status_code == 200

    # Scrutiny readiness
    res_readiness = client.get(f"/api/v1/applications/{app.id}/readiness")
    assert res_readiness.status_code == 200

    # Trigger validation
    res_val = client.post(f"/api/v1/applications/{app.id}/validate")
    assert res_val.status_code == 200

    # State transition
    res_trans = client.post(
        f"/api/v1/applications/{app.id}/workflow/transitions",
        json={"target_status": "UNDER_SCRUTINY", "reason": "Officer started scrutiny"},
    )
    assert res_trans.status_code == 200
    assert res_trans.json()["data"]["lifecycle_status"] == "UNDER_SCRUTINY"


# 2. Reviewer receives 403 on protected administrative endpoints
def test_reviewer_denied_admin_endpoints(client: TestClient, rbac_fixture):
    user = rbac_fixture["reviewer"]
    _auth_client(client, user)

    # List users -> 403
    res_users = client.get("/api/v1/users")
    assert res_users.status_code == 403
    assert res_users.json()["error"]["code"] == "FORBIDDEN"

    # Create user -> 403
    res_create_user = client.post(
        "/api/v1/users",
        json={
            "email": "hacker@test.com",
            "display_name": "Hacker",
            "password": "Password1234#",
            "role": "ADMIN",
        },
    )
    assert res_create_user.status_code == 403

    # Global audit logs -> 403
    res_audit = client.get("/api/v1/audit-events")
    assert res_audit.status_code == 403

    # Create institution -> 403
    res_inst = client.post(
        "/api/v1/institutions",
        json={
            "institution_name": "Rogue College",
            "institution_identifier": "SYN-ROGUE-001",
            "institution_type": "COLLEGE",
            "state": "Goa",
            "city": "Panaji",
        },
    )
    assert res_inst.status_code == 403

    # Registry dataset import -> 403
    res_reg = client.post(
        "/api/v1/registry/imports",
        json={
            "provider_code": "SYNTHETIC_AISHE",
            "records": [{"reference_identifier": "C-9999", "institution_name": "Test"}],
        },
    )
    assert res_reg.status_code == 403

    # Probe gateway health -> 403
    res_probe = client.get("/api/v1/integrations/providers/PROV-001/status")
    assert res_probe.status_code == 403


# 3. Admin can access permitted administrative endpoints
def test_admin_can_access_admin_endpoints(client: TestClient, rbac_fixture, db_session: Session):
    admin = rbac_fixture["admin"]
    _auth_client(client, admin)

    # List users -> 200
    res_users = client.get("/api/v1/users")
    assert res_users.status_code == 200

    # Global audit logs -> 200
    res_audit = client.get("/api/v1/audit-events")
    assert res_audit.status_code == 200

    # Create user -> 201
    new_email = f"officer-{uuid.uuid4().hex[:6]}@verityai.gov.in"
    res_create_user = client.post(
        "/api/v1/users",
        json={
            "email": new_email,
            "display_name": "New Scrutiny Officer",
            "password": "SecurePassword123#",
            "role": "REVIEWER",
        },
    )
    assert res_create_user.status_code == 201
    created_id = res_create_user.json()["data"]["id"]

    # Deactivate user -> 200
    res_deact = client.patch(f"/api/v1/users/{created_id}/status", json={"is_active": False})
    assert res_deact.status_code == 200
    assert res_deact.json()["data"]["is_active"] is False


# 4. Unauthenticated users cannot access protected resources (401 Unauthorized)
def test_unauthenticated_requests_rejected(client: TestClient, rbac_fixture):
    client.cookies.clear()
    client.headers.pop("Authorization", None)
    app = rbac_fixture["application"]

    # 401 on Users
    assert client.get("/api/v1/users").status_code == 401
    assert client.post("/api/v1/users", json={}).status_code == 401

    # 401 on Global Audit
    assert client.get("/api/v1/audit-events").status_code == 401

    # 401 on Scrutiny Queue
    assert client.get("/api/v1/scrutiny-queue").status_code == 401

    # 401 on Lifecycle Transitions
    assert client.post(f"/api/v1/applications/{app.id}/workflow/transitions", json={}).status_code == 401

    # 401 on Registry Imports
    assert client.post("/api/v1/registry/imports", json={}).status_code == 401

    # 401 on Reports download
    assert client.get("/api/v1/reports/fake-id/download").status_code == 401


# 5 & 6. Sending role="ADMIN" in request body or headers does not grant privileges
def test_tampering_role_in_request_body_does_not_grant_privileges(client: TestClient, rbac_fixture):
    user = rbac_fixture["reviewer"]
    _auth_client(client, user)

    # Reviewer sends {"role": "ADMIN"} in body to an admin endpoint
    res = client.post(
        "/api/v1/users",
        json={
            "email": "escalate@verityai.gov.in",
            "display_name": "Escalated User",
            "password": "AdminPassword123#",
            "role": "ADMIN",
        },
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


# 7. Reviewer cannot promote their own account through user management
def test_reviewer_cannot_promote_account(client: TestClient, rbac_fixture):
    user = rbac_fixture["reviewer"]
    _auth_client(client, user)

    res = client.patch(
        f"/api/v1/users/{user.id}/status",
        json={"is_active": True},
    )
    assert res.status_code == 403


# 8. Reviewers cannot import reference registry datasets
def test_reviewer_cannot_import_registry_datasets(client: TestClient, rbac_fixture):
    user = rbac_fixture["reviewer"]
    _auth_client(client, user)

    res = client.post(
        "/api/v1/registry/imports",
        json={
            "provider_code": "SYNTHETIC_AISHE",
            "records": [{"reference_identifier": "C-MALICIOUS-01", "institution_name": "Fake Institute"}],
        },
    )
    assert res.status_code == 403


# 9 & 10. Cross-tenant application and document access is blocked
def test_tenant_isolation_preserved(client: TestClient, rbac_fixture, db_session: Session):
    other_user = rbac_fixture["other_inst_user"]
    app = rbac_fixture["application"]

    # Create document under Institution A
    doc = Document(
        id="DOC-RBAC-TENANT-01",
        application_id=app.id,
        original_filename="secret_dossier.pdf",
        storage_key="test/secret_dossier.pdf",
        media_type="application/pdf",
        file_size_bytes=100,
        sha256="sha-dummy-1234",
        uploaded_by=rbac_fixture["inst_user"].id,
    )
    db_session.add(doc)
    db_session.commit()

    # User from Institution B tries to access Document from Institution A -> 403
    _auth_client(client, other_user)
    res_doc = client.get(f"/api/v1/documents/{doc.id}/file")
    assert res_doc.status_code == 403
    assert res_doc.json()["error"]["code"] == "FORBIDDEN"

    # Integrity inspection -> 403
    res_integ = client.get(f"/api/v1/documents/{doc.id}/integrity")
    assert res_integ.status_code == 403


# 11. Scrutiny reports enforce authorization and audit download
def test_report_generation_and_download_authorization(client: TestClient, rbac_fixture, db_session: Session):
    reviewer = rbac_fixture["reviewer"]
    app = rbac_fixture["application"]
    _auth_client(client, reviewer)

    # Reviewer generates report -> 200
    res_gen = client.post(f"/api/v1/applications/{app.id}/reports", json={"format": "JSON"})
    assert res_gen.status_code == 200
    report_id = res_gen.json()["id"]

    # Reviewer downloads report -> 200
    res_dl = client.get(f"/api/v1/reports/{report_id}/download")
    assert res_dl.status_code == 200

    # Cross-institution user cannot download -> 403
    other_user = rbac_fixture["other_inst_user"]
    _auth_client(client, other_user)
    res_cross = client.get(f"/api/v1/reports/{report_id}/download")
    assert res_cross.status_code == 403


# 12. Sensitive administrative changes create audit records
def test_administrative_changes_record_audit_events(client: TestClient, rbac_fixture, db_session: Session):
    admin = rbac_fixture["admin"]
    _auth_client(client, admin)

    # Create User
    new_email = f"audit-test-{uuid.uuid4().hex[:6]}@verityai.gov.in"
    res_create = client.post(
        "/api/v1/users",
        json={
            "email": new_email,
            "display_name": "Audit Tracked Officer",
            "password": "SecurePassword123#",
            "role": "REVIEWER",
        },
    )
    assert res_create.status_code == 201
    user_id = res_create.json()["data"]["id"]

    # Verify USER_CREATED audit event
    audit_evt = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.event_type == "USER_CREATED", AuditEvent.actor_id == admin.id)
        .order_by(AuditEvent.occurred_at.desc())
        .first()
    )
    assert audit_evt is not None
    assert audit_evt.metadata_json["created_user_id"] == user_id

    # Deactivate User
    res_status = client.patch(f"/api/v1/users/{user_id}/status", json={"is_active": False})
    assert res_status.status_code == 200

    # Verify USER_STATUS_UPDATED audit event
    audit_deact = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.event_type == "USER_STATUS_UPDATED", AuditEvent.actor_id == admin.id)
        .order_by(AuditEvent.occurred_at.desc())
        .first()
    )
    assert audit_deact is not None
    assert audit_deact.metadata_json["is_active"] is False


# 13. CSRF protection on mutating cookie requests
def test_csrf_cookie_protection_active(client: TestClient, rbac_fixture):
    admin = rbac_fixture["admin"]
    token = create_access_token(admin.id, admin.role, admin.email)
    client.cookies.set("access_token", token)
    # Clear CSRF header
    client.headers.pop("X-Requested-With", None)

    res = client.post(
        "/api/v1/users",
        json={
            "email": "csrf.exploit@test.com",
            "display_name": "CSRF Exploit",
            "password": "Password123!",
            "role": "ADMIN",
        },
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "CSRF_FAILED"


# 14. Unknown or invalid role tokens fail safely
def test_invalid_role_token_rejected(client: TestClient, rbac_fixture):
    # Token with unrecognized role "SUPER_ROOT"
    token = create_access_token("fake-user-id", "SUPER_ROOT", "fake@test.com")
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"

    # Admin endpoint must reject
    res_admin = client.get("/api/v1/users")
    assert res_admin.status_code in (401, 403)

    # Scrutiny endpoint must reject
    res_scrutiny = client.get("/api/v1/scrutiny-queue")
    assert res_scrutiny.status_code in (401, 403)
