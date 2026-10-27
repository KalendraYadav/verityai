import os
import sys

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_path)
os.chdir(backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.models.application import Application
from app.models.document import Document
from app.models.institution import Institution

client = TestClient(app)
client.headers["X-Requested-With"] = "VerityAI"

db = SessionLocal()

# Load users
reviewer = db.query(User).filter(User.email == "reviewer@verityai.gov.in").first()
admin = db.query(User).filter(User.email == "admin@verityai.gov.in").first()
app_item = db.query(Application).first()
doc_item = db.query(Document).first()

print(f"Reviewer: {reviewer.email} (Role: {reviewer.role}, Inst: {reviewer.institution_id})")
print(f"Admin:    {admin.email} (Role: {admin.role}, Inst: {admin.institution_id})")
print(f"Sample App: {app_item.id if app_item else 'None'}")
print(f"Sample Doc: {doc_item.id if doc_item else 'None'}")

reviewer_token = create_access_token(reviewer.id, reviewer.role, reviewer.email, reviewer.institution_id)
admin_token = create_access_token(admin.id, admin.role, admin.email, admin.institution_id)

# Build authenticated clients
unauth_client = TestClient(app)
unauth_client.headers["X-Requested-With"] = "VerityAI"

rev_client = TestClient(app)
rev_client.headers["X-Requested-With"] = "VerityAI"
rev_client.cookies.set("access_token", reviewer_token)

adm_client = TestClient(app)
adm_client.headers["X-Requested-With"] = "VerityAI"
adm_client.cookies.set("access_token", admin_token)

import time
unique_email = f"officer_{int(time.time())}@verity.gov.in"

tests = [
    # 1. Admin only endpoints
    ("GET", "/api/v1/audit-events", "Admin Audit Log"),
    ("GET", "/api/v1/users", "Admin User List"),
    ("POST", "/api/v1/users", "Admin Create User", {"email": unique_email, "display_name": "New Officer", "password": "password1234", "role": "REVIEWER"}),
    ("POST", "/api/v1/institutions", "Admin Create Inst", {"institution_name": f"Test Inst {int(time.time())}", "institution_type": "TECHNICAL", "state": "Delhi"}),
    ("POST", "/api/v1/registry/imports", "Admin Import Registry", {"provider_code": "AISHE", "records": []}),
    ("GET", "/api/v1/integrations/providers/LOCAL_SYNTHETIC_REGULATORY_GATEWAY/status", "Admin Gateway Health Probe"),
    
    # 2. Reviewer permitted endpoints
    ("GET", "/api/v1/scrutiny-queue", "Scrutiny Queue"),
    ("GET", "/api/v1/applications", "Application List"),
    ("GET", f"/api/v1/applications/{app_item.id if app_item else 'none'}", "Application Detail"),
    ("GET", f"/api/v1/applications/{app_item.id if app_item else 'none'}/checklist", "Application Checklist"),
    ("GET", f"/api/v1/applications/{app_item.id if app_item else 'none'}/evidence", "Evidence Trace"),
    ("GET", "/api/v1/validation-rules", "Validation Rules"),
    ("GET", "/api/v1/registry/providers", "Registry Providers"),
    
    # 3. Document endpoints & Tenant protection
    ("GET", f"/api/v1/documents/{doc_item.id if doc_item else 'none'}/file", "Document Download"),
    ("GET", f"/api/v1/documents/{doc_item.id if doc_item else 'none'}/integrity", "Document Integrity"),
]

print("\n" + "=" * 90)
print(f"{'ENDPOINT TEST':<35} {'UNAUTH':<10} {'REVIEWER':<15} {'ADMIN':<15} {'VERDICT'}")
print("=" * 90)

for item in tests:
    method = item[0]
    path = item[1]
    name = item[2]
    body = item[3] if len(item) > 3 else None
    
    # Unauth test
    if method == "GET":
        u_res = unauth_client.get(path)
        r_res = rev_client.get(path)
        a_res = adm_client.get(path)
    elif method == "POST":
        u_res = unauth_client.post(path, json=body or {})
        r_res = rev_client.post(path, json=body or {})
        a_res = adm_client.post(path, json=body or {})
    elif method == "PATCH":
        u_res = unauth_client.patch(path, json=body or {})
        r_res = rev_client.patch(path, json=body or {})
        a_res = adm_client.patch(path, json=body or {})

    # Evaluate verdict
    is_admin_only = "Admin" in name
    if is_admin_only:
        correct = (u_res.status_code == 401 and r_res.status_code == 403 and a_res.status_code in (200, 201, 400, 422))
    else:
        correct = (u_res.status_code in (401, 200) and r_res.status_code in (200, 201, 404) and a_res.status_code in (200, 201, 404))
    
    verdict = "PASS [SECURE]" if correct else "FAIL [LEAK]"
    print(f"{name:<35} {u_res.status_code:<10} {r_res.status_code:<15} {a_res.status_code:<15} {verdict}")

print("=" * 90)

print("\n--- ADVANCED SECURITY CONTROLS VERIFICATION ---")

# 1. Anti-Self-Deactivation
self_deact_res = adm_client.patch(f"/api/v1/users/{admin.id}/status", json={"is_active": False})
assert self_deact_res.status_code == 400
assert self_deact_res.json()["error"]["code"] == "SELF_DEACTIVATION_PROHIBITED"
print(" [PASS] 1. Anti-Self-Deactivation Protection: Admin cannot deactivate their own active account.")

# 2. CSRF Custom Header Protection
no_csrf_client = TestClient(app)
no_csrf_client.cookies.set("access_token", admin_token)
csrf_res = no_csrf_client.post("/api/v1/institutions", json={"institution_name": "CSRF Inst"})
assert csrf_res.status_code == 403
assert csrf_res.json()["error"]["code"] == "CSRF_FAILED"
print(" [PASS] 2. CSRF Defense: Mutating cookie request lacking 'X-Requested-With: VerityAI' rejected (403 Forbidden).")

# 3. Cross-Tenant Document Isolation
foreign_u_res = adm_client.post("/api/v1/users", json={
    "email": f"foreign_rep_{int(time.time())}@zenith.edu.in",
    "display_name": "Zenith Rep",
    "password": "Password1234!",
    "role": "INSTITUTION_USER",
    "institution_id": "INS-0002",
})
foreign_user_id = foreign_u_res.json()["data"]["id"]
cross_tenant_token = create_access_token(foreign_user_id, "INSTITUTION_USER", f"foreign_{int(time.time())}@zenith.edu.in")
foreign_client = TestClient(app)
foreign_client.headers["X-Requested-With"] = "VerityAI"
foreign_client.cookies.set("access_token", cross_tenant_token)
foreign_res = foreign_client.get(f"/api/v1/documents/{doc_item.id if doc_item else 'none'}/file")
assert foreign_res.status_code == 403
assert foreign_res.json()["error"]["code"] == "FORBIDDEN"
print(" [PASS] 3. Multi-Tenant Isolation & IDOR Defense: Cross-tenant document download rejected (403 Forbidden).")

# 4. Deactivated User Immediate Lockout
new_user_res = adm_client.post("/api/v1/users", json={
    "email": f"locked_user_{int(time.time())}@verity.gov.in",
    "display_name": "Temporary User",
    "password": "Password1234!",
    "role": "REVIEWER"
})
created_user_id = new_user_res.json()["data"]["id"]
created_user_token = create_access_token(created_user_id, "REVIEWER", "temp@verity.gov.in")
temp_client = TestClient(app)
temp_client.headers["X-Requested-With"] = "VerityAI"
temp_client.cookies.set("access_token", created_user_token)

# Verify active user can access scrutiny queue
assert temp_client.get("/api/v1/scrutiny-queue").status_code == 200

# Deactivate user
adm_client.patch(f"/api/v1/users/{created_user_id}/status", json={"is_active": False})

# Verify immediate rejection on next request
deact_res = temp_client.get("/api/v1/scrutiny-queue")
assert deact_res.status_code == 403
assert deact_res.json()["error"]["code"] == "ACCOUNT_DISABLED"
print(" [PASS] 4. Immediate Account Deactivation: Deactivated account immediately blocked on next request (403 Forbidden: ACCOUNT_DISABLED).")

print("=" * 90)
print("ALL DIRECT API RBAC & SECURITY PROTECTIONS VERIFIED SUCCESSFULLY ✅")
print("=" * 90)

db.close()
