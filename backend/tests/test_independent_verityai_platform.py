import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.models.integration_client import IntegrationClient
from app.models.integration_job import IntegrationScrutinyJob
from app.services.api_key import (
    create_api_client,
    rotate_api_client_secret,
    revoke_api_client,
    authenticate_api_key,
    verify_client_scope,
)


@pytest.fixture
def isolated_test_db(tmp_path):
    """Isolated SQLite database fixture for independent platform tests."""
    db_file = tmp_path / "test_verity_platform.db"
    test_engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSession()
    # Create an admin user for client management endpoints
    admin_user = User(
        id="usr-platform-admin-01",
        email="platform_admin@verityai.gov.in",
        display_name="Platform Admin",
        role="ADMIN",
        password_hash="fake-hashed-password",
        is_active=True,
    )
    db.add(admin_user)
    db.commit()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield client, db, admin_user

    app.dependency_overrides.clear()
    db.close()
    test_engine.dispose()


def test_credential_generation_and_hashing(isolated_test_db):
    """Verify cryptographically secure key generation and constant-time authentication."""
    _, db, admin = isolated_test_db

    client_rec, raw_secret = create_api_client(
        db=db,
        client_name="Test Partner Portal",
        scopes=["scrutiny:create", "scrutiny:read"],
        created_by=admin.id,
    )

    assert client_rec.client_id.startswith("vai_client_")
    assert raw_secret.startswith("vai_sec_")
    # Verify raw secret is NOT stored in plain text
    assert raw_secret != client_rec.secret_hash
    assert len(client_rec.secret_hash) == 64  # SHA-256 hex string

    # Authenticate valid token
    token = f"{client_rec.client_id}:{raw_secret}"
    authenticated = authenticate_api_key(db=db, raw_key_token=token)
    assert authenticated.client_id == client_rec.client_id

    # Verify invalid secret fails with 401
    with pytest.raises(Exception) as exc_info:
        authenticate_api_key(db=db, raw_key_token=f"{client_rec.client_id}:wrong_secret")
    assert "401" in str(exc_info.value) or exc_info.value.status_code == 401


def test_client_rotation_and_revocation(isolated_test_db):
    """Verify key rotation issues new secret and revocation disables access."""
    _, db, admin = isolated_test_db

    client_rec, old_secret = create_api_client(
        db=db,
        client_name="Rotatable Client",
        scopes=["scrutiny:create"],
        created_by=admin.id,
    )

    # Rotate secret
    _, new_secret = rotate_api_client_secret(db=db, client_id=client_rec.client_id, actor_id=admin.id)
    assert new_secret != old_secret

    # Old secret is immediately rejected
    with pytest.raises(Exception):
        authenticate_api_key(db=db, raw_key_token=f"{client_rec.client_id}:{old_secret}")

    # New secret is accepted
    auth_client = authenticate_api_key(db=db, raw_key_token=f"{client_rec.client_id}:{new_secret}")
    assert auth_client.client_id == client_rec.client_id

    # Revoke client
    revoke_api_client(db=db, client_id=client_rec.client_id, actor_id=admin.id)
    with pytest.raises(Exception):
        authenticate_api_key(db=db, raw_key_token=f"{client_rec.client_id}:{new_secret}")


def test_gateway_health_endpoint(isolated_test_db):
    """Verify GET /api/v1/integrations/health provides public capabilities probe."""
    client, _, _ = isolated_test_db

    resp = client.get("/api/v1/integrations/health")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "healthy"
    assert "VerityAI" in data["platform"]
    assert "DETERMINISTIC_REGULATORY_VALIDATION" in data["capabilities"]


def test_gateway_authentication_and_scopes(isolated_test_db):
    """Verify missing, invalid, or under-scoped API keys are rejected at gateway."""
    client, db, admin = isolated_test_db

    # Create client with ONLY scrutiny:read (no scrutiny:create)
    read_only_client, raw_secret = create_api_client(
        db=db,
        client_name="Read Only Client",
        scopes=["scrutiny:read"],
        created_by=admin.id,
    )
    api_key = f"{read_only_client.client_id}:{raw_secret}"

    # 1. Missing Key -> 401
    resp1 = client.post("/api/v1/integrations/scrutiny-jobs", data={"external_reference": "EXT-01"})
    assert resp1.status_code == 401

    # 2. Invalid Key -> 401
    resp2 = client.post(
        "/api/v1/integrations/scrutiny-jobs",
        headers={"X-API-Key": "vai_client_fake:vai_sec_fake"},
        data={"external_reference": "EXT-01"}
    )
    assert resp2.status_code == 401

    # 3. Insufficient Scope -> 403 (Client has scrutiny:read but endpoint requires scrutiny:create)
    fake_pdf = io.BytesIO(b"%PDF-1.4 sample pdf content")
    resp3 = client.post(
        "/api/v1/integrations/scrutiny-jobs",
        headers={"X-API-Key": api_key},
        data={"external_reference": "EXT-01", "category_code": "ENGINEERING_AND_TECHNOLOGY"},
        files={"files": ("test.pdf", fake_pdf, "application/pdf")},
    )
    assert resp3.status_code == 403
    assert resp3.json()["error"]["code"] == "INSUFFICIENT_SCOPES"


def test_external_scrutiny_lifecycle_and_results(isolated_test_db):
    """Verify full decoupled scrutiny job creation, execution, results, and report download."""
    client, db, admin = isolated_test_db

    client_rec, raw_secret = create_api_client(
        db=db,
        client_name="External Directorate",
        scopes=["scrutiny:create", "scrutiny:read", "documents:upload"],
        created_by=admin.id,
    )
    api_key = f"{client_rec.client_id}:{raw_secret}"

    fake_pdf = io.BytesIO(
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n"
        b"4 0 obj\n<< /Length 75 >>\nstream\n"
        b"Land survey contiguous: 8.5 acres. Fire NOC municipal certificate valid.\n"
        b"endstream\nendobj\nxref\n0 5\n0000000000 65535 f \n"
        b"trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n250\n%%EOF"
    )

    declared_data = json.dumps({
        "land_area_acres": 8.5,
        "total_built_up_area_sqm": 12000,
        "total_approved_intake": 480,
    })

    # Step 1: Submit Scrutiny Dossier
    create_resp = client.post(
        "/api/v1/integrations/scrutiny-jobs?run_async=false",
        headers={"X-API-Key": api_key, "X-Idempotency-Key": "IDEMP-TEST-001"},
        data={
            "external_reference": "EXT-DIR-2026-9901",
            "category_code": "ENGINEERING_AND_TECHNOLOGY",
            "declared_data": declared_data,
        },
        files={"files": ("land_record.pdf", fake_pdf, "application/pdf")},
    )
    assert create_resp.status_code == 202
    job_info = create_resp.json()["data"]
    job_id = job_info["job_id"]
    assert job_id.startswith("VAI-JOB-")
    assert job_info["status"] == "COMPLETED"

    # Step 2: Idempotent Replay (same idempotency key returns same job)
    fake_pdf2 = io.BytesIO(b"%PDF-1.4 test")
    replay_resp = client.post(
        "/api/v1/integrations/scrutiny-jobs",
        headers={"X-API-Key": api_key, "X-Idempotency-Key": "IDEMP-TEST-001"},
        data={
            "external_reference": "EXT-DIR-2026-9901",
            "category_code": "ENGINEERING_AND_TECHNOLOGY",
        },
        files={"files": ("land_record.pdf", fake_pdf2, "application/pdf")},
    )
    assert replay_resp.status_code == 202
    assert replay_resp.json()["data"]["job_id"] == job_id

    # Step 3: Query Status
    status_resp = client.get(
        f"/api/v1/integrations/scrutiny-jobs/{job_id}",
        headers={"X-API-Key": api_key},
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["status"] == "COMPLETED"

    # Step 4: Retrieve Results
    results_resp = client.get(
        f"/api/v1/integrations/scrutiny-jobs/{job_id}/results",
        headers={"X-API-Key": api_key},
    )
    assert results_resp.status_code == 200
    results_data = results_resp.json()["data"]
    assert results_data["summary"]["total_documents"] >= 1
    assert len(results_data["rule_results"]) >= 1

    # Step 5: Download PDF Report
    report_resp = client.get(
        f"/api/v1/integrations/scrutiny-jobs/{job_id}/report",
        headers={"X-API-Key": api_key},
    )
    assert report_resp.status_code == 200
    assert report_resp.headers["content-type"] == "application/pdf"
    assert len(report_resp.content) > 100


def test_cross_client_isolation(isolated_test_db):
    """Verify Client A cannot inspect or download results from Client B."""
    client, db, admin = isolated_test_db

    # Create Client A
    client_a, secret_a = create_api_client(db=db, client_name="Client A", created_by=admin.id)
    key_a = f"{client_a.client_id}:{secret_a}"

    # Create Client B
    client_b, secret_b = create_api_client(db=db, client_name="Client B", created_by=admin.id)
    key_b = f"{client_b.client_id}:{secret_b}"

    # Client A creates a job
    fake_pdf = io.BytesIO(b"%PDF-1.4 sample")
    res_a = client.post(
        "/api/v1/integrations/scrutiny-jobs?run_async=false",
        headers={"X-API-Key": key_a},
        data={"external_reference": "REF-A-01"},
        files={"files": ("doc_a.pdf", fake_pdf, "application/pdf")},
    )
    job_id_a = res_a.json()["data"]["job_id"]

    # Client B attempts to query Client A's job -> 403 Forbidden
    cross_resp = client.get(
        f"/api/v1/integrations/scrutiny-jobs/{job_id_a}",
        headers={"X-API-Key": key_b},
    )
    assert cross_resp.status_code == 403
    assert cross_resp.json()["error"]["code"] == "CROSS_CLIENT_FORBIDDEN"

    # Client B attempts to download Client A's report -> 403 Forbidden
    cross_report = client.get(
        f"/api/v1/integrations/scrutiny-jobs/{job_id_a}/report",
        headers={"X-API-Key": key_b},
    )
    assert cross_report.status_code == 403


def test_portal_server_side_integration_client(isolated_test_db):
    """Verify that Current Institutional Portal acts as Client 1 via server-side client."""
    from app.models.institution import Institution
    from app.models.category import ApplicationCategory
    from app.models.application import Application
    from app.services.verity_client import trigger_portal_application_scrutiny

    _, db, admin = isolated_test_db

    # Create dummy institution and category
    inst = Institution(id="inst-demo-portal", institution_name="Demo Tech Institute", institution_identifier="DEMO-001")
    cat = ApplicationCategory(code="ENGINEERING_AND_TECHNOLOGY", name="Engineering & Tech", provenance="AICTE")
    db.add(inst)
    db.add(cat)
    db.commit()

    # Create dummy application
    app_obj = Application(
        id="app-portal-test-01",
        application_reference="VAI-2026-PORTAL-01",
        institution_id=inst.id,
        category_code=cat.code,
        lifecycle_status="SUBMITTED",
        declared_data={"land_area_acres": 10.0, "total_built_up_area_sqm": 12000, "total_approved_intake": 480},
        created_by=admin.id,
    )
    db.add(app_obj)
    db.commit()

    # Execute server-side scrutiny call
    int_job = trigger_portal_application_scrutiny(
        db=db,
        application_id=app_obj.id,
        actor_id=admin.id,
    )

    assert int_job.id.startswith("VAI-JOB-")
    assert int_job.client_id == "vai_client_portal_internal"
    assert int_job.internal_application_id == app_obj.id
    assert int_job.status == "COMPLETED"
    assert len(int_job.rule_results) >= 1

