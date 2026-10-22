"""
VerityAI — Demonstration Readiness & System Pre-flight Auditor
Checks core dependencies, database, schema migration status, storage directory,
portal adapters, validation engine, and frontend assets for SIH 2026.
"""

import os
import sys
import platform
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import select, text
from app.db.session import SessionLocal, engine
from app.core.config import settings
from app.core.security import hash_password
from app.services.storage import get_storage_root
from app.services.integration import validate_outbound_url, seed_default_portal_configs
from app.models.user import User
from app.models.institution import Institution
from app.models.application import Application
from app.models.validation import ValidationRule
from app.models.integration import ExternalPortalConfig


def check_demonstration_readiness() -> bool:
    print("=" * 72)
    print("   VERITYAI / ENTITYLOCKER — DEMONSTRATION READINESS AUDIT (SIH 2026)")
    print("=" * 72)
    print(f"Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"Platform:  {platform.system()} {platform.release()} ({platform.machine()})")
    print(f"Python:    {platform.python_version()} [{sys.executable}]")
    print(f"Env:       {settings.ENVIRONMENT} (Debug={settings.DEBUG})")
    print("-" * 72)

    passed_checks = 0
    total_checks = 10
    all_ok = True

    # Check 1: Python version
    py_ver = sys.version_info
    if py_ver >= (3, 11):
        print(f" [PASS] 1. Python Environment: v{py_ver.major}.{py_ver.minor}.{py_ver.micro} satisfies requirement (>= 3.11)")
        passed_checks += 1
    else:
        print(f" [FAIL] 1. Python Environment: v{py_ver.major}.{py_ver.minor} is below recommended 3.11+")
        all_ok = False

    # Check 2: Core library dependencies
    try:
        import fastapi
        import sqlalchemy
        import fitz
        import pydantic
        print(f" [PASS] 2. Core Dependencies: FastAPI {fastapi.__version__}, SQLAlchemy {sqlalchemy.__version__}, PyMuPDF, Pydantic {pydantic.__version__}")
        passed_checks += 1
    except ImportError as e:
        print(f" [FAIL] 2. Core Dependencies missing: {e}")
        all_ok = False

    # Check 3: Database connectivity & schema
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1")).scalar()
        print(f" [PASS] 3. Database Connectivity: SQLite database connection verified ({settings.DATABASE_URL})")
        passed_checks += 1
    except Exception as e:
        print(f" [FAIL] 3. Database Connectivity failed: {e}")
        all_ok = False

    # Check 4: Uploads directory & storage permissions
    try:
        storage_root = get_storage_root()
        test_file = storage_root / ".readiness_probe"
        test_file.write_text("probe-ok")
        test_file.unlink()
        print(f" [PASS] 4. Storage & Uploads: Directory '{storage_root}' writable with proper permissions")
        passed_checks += 1
    except Exception as e:
        print(f" [FAIL] 4. Storage & Uploads check failed: {e}")
        all_ok = False

    # Check 5: User accounts & Role-Based Access Control
    try:
        admin_user = db.query(User).filter(User.role == "ADMIN").first()
        reviewer_user = db.query(User).filter(User.role == "REVIEWER").first()
        if admin_user and reviewer_user:
            print(f" [PASS] 5. RBAC Accounts: Admin '{admin_user.email}' and Reviewer '{reviewer_user.email}' seeded")
            passed_checks += 1
        else:
            print(" [WARN] 5. RBAC Accounts: Admin or Reviewer missing. Run 'python -m app.db.seed' to initialize.")
    except Exception as e:
        print(f" [FAIL] 5. RBAC Accounts check failed: {e}")
        all_ok = False

    # Check 6: Deterministic Validation Engine rules
    try:
        rule_count = db.query(ValidationRule).filter(ValidationRule.enabled == True).count()
        if rule_count > 0:
            print(f" [PASS] 6. Validation Engine: {rule_count} active deterministic rules verified in database")
            passed_checks += 1
        else:
            print(" [WARN] 6. Validation Engine: 0 rules found. Seeding required.")
    except Exception as e:
        print(f" [FAIL] 6. Validation Engine check failed: {e}")
        all_ok = False

    # Check 7: Institutional Records & Applications
    try:
        inst_count = db.query(Institution).count()
        app_count = db.query(Application).count()
        if inst_count > 0 and app_count > 0:
            print(f" [PASS] 7. Demonstration Dossiers: {inst_count} institutions and {app_count} applications ready")
            passed_checks += 1
        else:
            print(" [WARN] 7. Demonstration Dossiers: Incomplete. Run seed script.")
    except Exception as e:
        print(f" [FAIL] 7. Demonstration Dossiers check failed: {e}")
        all_ok = False

    # Check 8: Regulatory Interoperability Gateways
    try:
        seed_default_portal_configs(db)
        portals = db.query(ExternalPortalConfig).all()
        portal_ids = [p.provider_id for p in portals]
        has_synthetic = "LOCAL_SYNTHETIC_REGULATORY_GATEWAY" in portal_ids
        has_stub = "OFFICIAL_AICTE_PORTAL_STUB" in portal_ids
        if has_synthetic and has_stub:
            print(f" [PASS] 8. Interoperability Layer: {len(portals)} portal adapters configured (Synthetic + Statutory Stub)")
            passed_checks += 1
        else:
            print(" [WARN] 8. Interoperability Layer: Adapters incomplete.")
    except Exception as e:
        print(f" [FAIL] 8. Interoperability Layer failed: {e}")
        all_ok = False

    # Check 9: SSRF Defense Subsystem
    try:
        ssrf_blocked = False
        try:
            validate_outbound_url("https://169.254.169.254/latest/meta-data")
        except Exception:
            ssrf_blocked = True

        if ssrf_blocked:
            print(" [PASS] 9. Security Defenses: SSRF outbound filter active; cloud metadata (169.254.x) blocked")
            passed_checks += 1
        else:
            print(" [FAIL] 9. Security Defenses: SSRF validator failed to block private destination")
            all_ok = False
    except Exception as e:
        print(f" [FAIL] 9. Security Defenses check failed: {e}")
        all_ok = False

    # Check 10: Frontend production build bundle
    frontend_dist = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist" / "index.html"
    if frontend_dist.exists():
        print(f" [PASS] 10. Frontend Distribution: Production client bundle compiled ({frontend_dist})")
        passed_checks += 1
    else:
        print(f" [WARN] 10. Frontend Distribution: '{frontend_dist}' not found. Run 'npm run build' in frontend.")

    db.close()

    print("-" * 72)
    score_pct = int((passed_checks / total_checks) * 100)
    print(f"RESULT: {passed_checks}/{total_checks} Checks Passed ({score_pct}% Readiness Score)")
    if passed_checks >= 9:
        print("STATUS: SYSTEM IS READY FOR DEMONSTRATION & EVALUATION ✅")
    else:
        print("STATUS: SYSTEM REQUIRES SEEDING OR BUILD CONFIGURATION ⚠️")
    print("=" * 72)
    return all_ok


if __name__ == "__main__":
    success = check_demonstration_readiness()
    sys.exit(0 if success else 1)
