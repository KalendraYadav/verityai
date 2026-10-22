import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.user import User
from app.core.security import hash_password, create_access_token
from app.services.storage import resolve_storage_path
from app.core.exceptions import StorageException


@pytest.fixture
def test_user(db_session: Session):
    user = User(
        id="usr-sec-test-01",
        email="security.tester@verityai.gov.in",
        display_name="Security Auditor",
        password_hash=hash_password("SecAuditorPass1!"),
        role="REVIEWER",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_security_headers_present(client: TestClient):
    """Verify standard security headers are attached to API responses."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert resp.headers.get("x-xss-protection") == "1; mode=block"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "accelerometer=()" in resp.headers.get("permissions-policy", "")


def test_path_traversal_rejection():
    """Verify that path traversal storage keys are strictly blocked."""
    with pytest.raises(StorageException):
        resolve_storage_path("../../etc/passwd")

    with pytest.raises(StorageException):
        resolve_storage_path("/absolute/path/escape")

    with pytest.raises(StorageException):
        resolve_storage_path("apps/../../../secret.key")


def test_unauthorized_download_not_found(client: TestClient):
    """Verify non-existent report download returns 404 without path exposure."""
    resp = client.get("/api/v1/reports/non-existent-report-id/download")
    assert resp.status_code == 404
    body = resp.json()
    assert "error" in body
    # Ensure no internal filesystem paths are leaked in error message
    assert "/var/" not in str(body)
    assert "\\" not in str(body)


def test_csrf_protection_on_cookie_mutation(client: TestClient, test_user: User):
    """Verify mutating cookie-authenticated request fails without X-Requested-With header."""
    token = create_access_token(subject=test_user.id, role=test_user.role, email=test_user.email)
    client.cookies.set("access_token", token)

    # Missing X-Requested-With header should result in 403 CSRF_FAILED
    resp = client.post("/api/v1/auth/change-password", json={
        "current_password": "WrongPassword1!",
        "new_password": "NewPass123456!",
    })
    assert resp.status_code == 403
    err_body = resp.json().get("error", resp.json().get("detail", {}))
    assert err_body.get("code") == "CSRF_FAILED"

    # With correct X-Requested-With header, CSRF passes (proceeds to password check)
    resp_valid = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongPassword1!", "new_password": "NewPass123456!"},
        headers={"X-Requested-With": "VerityAI"},
    )
    assert resp_valid.status_code in (400, 401)
    valid_err = resp_valid.json().get("error", resp_valid.json().get("detail", {}))
    assert valid_err.get("code") != "CSRF_FAILED"


def test_health_check_database_probe(client: TestClient):
    """Verify health endpoint probes the database connectivity and reports healthy."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"]["status"] == "connected"
    assert "timestamp" in data


def test_env_example_contains_no_real_secrets():
    """Verify .env.example contains only safe placeholders and no production credentials."""
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.example")
    if os.path.isfile(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "change-this-insecure" in content
        assert "AKIA" not in content  # No AWS keys
        assert "AIza" not in content  # No Google API keys
