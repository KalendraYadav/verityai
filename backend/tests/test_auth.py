from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.models.audit import AuditEvent


@pytest.fixture
def test_users(db_session: Session):
    """Seed test accounts for authentication testing."""
    admin = User(
        id="usr-test-admin",
        email="admin@verityai.gov.in",
        display_name="Dr. Rajesh Admin",
        password_hash=hash_password("AdminSecurePass123!"),
        role="ADMIN",
        is_active=True,
        data_origin="SYNTHETIC_TEST",
    )
    reviewer = User(
        id="usr-test-reviewer",
        email="reviewer@verityai.gov.in",
        display_name="Prof. Sunita Reviewer",
        password_hash=hash_password("ReviewerPass123!"),
        role="REVIEWER",
        is_active=True,
        data_origin="SYNTHETIC_TEST",
    )
    viewer = User(
        id="usr-test-viewer",
        email="viewer@verityai.gov.in",
        display_name="Ananya Viewer",
        password_hash=hash_password("ViewerPass123!"),
        role="VIEWER",
        is_active=True,
        data_origin="SYNTHETIC_TEST",
    )
    disabled = User(
        id="usr-test-disabled",
        email="disabled@verityai.gov.in",
        display_name="Former Staff",
        password_hash=hash_password("DisabledPass123!"),
        role="REVIEWER",
        is_active=False,
        data_origin="SYNTHETIC_TEST",
    )
    db_session.add_all([admin, reviewer, viewer, disabled])
    db_session.commit()
    return {"admin": admin, "reviewer": reviewer, "viewer": viewer, "disabled": disabled}


def test_password_hashing_and_verification():
    raw_pass = "ComplexSecret#2026"
    pw_hash = hash_password(raw_pass)
    assert pw_hash.startswith("$argon2id$")
    assert verify_password(raw_pass, pw_hash) is True
    assert verify_password("WrongPassword!", pw_hash) is False


def test_login_success_sets_httponly_cookie(client: TestClient, test_users):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@verityai.gov.in", "password": "ReviewerPass123!"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["email"] == "reviewer@verityai.gov.in"
    assert data["role"] == "REVIEWER"
    assert "password_hash" not in data

    # Check HttpOnly cookie
    assert "access_token" in resp.cookies
    cookie = resp.cookies.get("access_token")
    assert cookie is not None


def test_login_invalid_password(client: TestClient, test_users, db_session: Session):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@verityai.gov.in", "password": "IncorrectPassword!"},
    )
    assert resp.status_code == 401
    err = resp.json()["error"]
    assert err["code"] == "INVALID_CREDENTIALS"

    # Audit event logged
    audit = db_session.query(AuditEvent).filter(AuditEvent.event_type == "USER_LOGIN_FAILED").first()
    assert audit is not None
    assert audit.metadata_json["email"] == "reviewer@verityai.gov.in"


def test_login_nonexistent_user(client: TestClient, test_users):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@nowhere.gov.in", "password": "AnyPassword123!"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_disabled_account(client: TestClient, test_users):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "disabled@verityai.gov.in", "password": "DisabledPass123!"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ACCOUNT_DISABLED"


def test_get_me_authenticated(client: TestClient, test_users):
    # Log in first
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@verityai.gov.in", "password": "AdminSecurePass123!"},
    )
    assert login_resp.status_code == 200

    # Get /me with cookie
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    data = me_resp.json()["data"]
    assert data["email"] == "admin@verityai.gov.in"
    assert data["role"] == "ADMIN"


def test_get_me_unauthenticated(client: TestClient):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_expired_token_rejected(client: TestClient, test_users):
    # Create expired token
    expired_token = create_access_token(
        subject="usr-test-reviewer",
        role="REVIEWER",
        email="reviewer@verityai.gov.in",
        expires_delta=timedelta(seconds=-60),
    )
    client.cookies.set("access_token", expired_token)
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_TOKEN"


def test_tampered_token_rejected(client: TestClient):
    client.cookies.set("access_token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature")
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_TOKEN"


def test_csrf_protection_on_cookie_mutating_requests(client: TestClient, test_users):
    # Login sets cookie
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@verityai.gov.in", "password": "ReviewerPass123!"},
    )
    assert login_resp.status_code == 200

    # Mutating POST without CSRF header must fail with 403 CSRF_FAILED
    fail_resp = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "ReviewerPass123!", "new_password": "NewReviewerPass2026#"},
    )
    assert fail_resp.status_code == 403
    assert fail_resp.json()["error"]["code"] == "CSRF_FAILED"

    # With X-Requested-With: VerityAI, it proceeds
    success_resp = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "ReviewerPass123!", "new_password": "NewReviewerPass2026#"},
        headers={"X-Requested-With": "VerityAI"},
    )
    assert success_resp.status_code == 200


def test_logout_clears_cookie(client: TestClient, test_users, db_session: Session):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@verityai.gov.in", "password": "ReviewerPass123!"},
    )
    assert login_resp.status_code == 200

    logout_resp = client.post(
        "/api/v1/auth/logout",
        headers={"X-Requested-With": "VerityAI"},
    )
    assert logout_resp.status_code == 200
    # Cookie deleted or empty
    assert client.cookies.get("access_token") is None or client.cookies.get("access_token") == ""

    # Verify audit event
    audit = db_session.query(AuditEvent).filter(AuditEvent.event_type == "USER_LOGOUT").first()
    assert audit is not None


def test_change_password_invalid_current(client: TestClient, test_users):
    client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@verityai.gov.in", "password": "ReviewerPass123!"},
    )
    resp = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongPassword999!", "new_password": "BrandNewPassword2026#"},
        headers={"X-Requested-With": "VerityAI"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_CURRENT_PASSWORD"


def test_role_guard_admin_only_endpoints(client: TestClient, test_users):
    # Reviewer attempts to access admin endpoint
    client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@verityai.gov.in", "password": "ReviewerPass123!"},
    )
    resp = client.get("/api/v1/users")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_admin_user_management_lifecycle(client: TestClient, test_users, db_session: Session):
    # Log in as admin
    client.post(
        "/api/v1/auth/login",
        json={"email": "admin@verityai.gov.in", "password": "AdminSecurePass123!"},
    )

    # List users
    list_resp = client.get("/api/v1/users")
    assert list_resp.status_code == 200
    assert list_resp.json()["meta"]["total"] >= 4

    # Create new user
    create_resp = client.post(
        "/api/v1/users",
        json={
            "email": "new.analyst@verityai.gov.in",
            "display_name": "Pooja Analyst",
            "password": "AnalystSecure2026#",
            "role": "REVIEWER",
        },
        headers={"X-Requested-With": "VerityAI"},
    )
    assert create_resp.status_code == 201
    new_user_id = create_resp.json()["data"]["id"]

    # Duplicate email fails
    dup_resp = client.post(
        "/api/v1/users",
        json={
            "email": "new.analyst@verityai.gov.in",
            "display_name": "Duplicate User",
            "password": "SomePass123!",
            "role": "REVIEWER",
        },
        headers={"X-Requested-With": "VerityAI"},
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error"]["code"] == "USER_ALREADY_EXISTS"

    # Deactivate new user
    patch_resp = client.patch(
        f"/api/v1/users/{new_user_id}/status",
        json={"is_active": False},
        headers={"X-Requested-With": "VerityAI"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["data"]["is_active"] is False

    # Admin self-deactivation prohibited
    admin_id = test_users["admin"].id
    self_deact_resp = client.patch(
        f"/api/v1/users/{admin_id}/status",
        json={"is_active": False},
        headers={"X-Requested-With": "VerityAI"},
    )
    assert self_deact_resp.status_code == 400
    assert self_deact_resp.json()["error"]["code"] == "SELF_DEACTIVATION_PROHIBITED"
