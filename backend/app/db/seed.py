import sys
from datetime import datetime, timezone
from argon2 import PasswordHasher
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.institution import Institution
from app.models.user import User
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.audit import AuditEvent

ph = PasswordHasher()
DEMO_PASSWORD_HASH = ph.hash("demo-password-2026")


def seed_database():
    """Idempotently seed synthetic demo institutions, users, categories, and applications."""
    db = SessionLocal()
    try:
        print("🌱 Starting VerityAI synthetic demo data seeding...")

        # 1. Seed Application Categories
        category_code = "EOA_ILLUSTRATIVE"
        category = db.scalar(select(ApplicationCategory).where(ApplicationCategory.code == category_code))
        if not category:
            category = ApplicationCategory(
                code=category_code,
                name="Extension of Approval (Illustrative)",
                description="Illustrative AICTE annual Extension of Approval application workflow for demonstration.",
                required_document_types=["ACCREDITATION_CERTIFICATE", "LAND_USE_CERTIFICATE"],
                required_declared_fields=["institution_name", "institution_identifier", "certificate_number", "certificate_expiry_date"],
                provenance="ILLUSTRATIVE",
                enabled=True,
            )
            db.add(category)
            print(f"  + Created Category: {category.code}")
        else:
            print(f"  * Category exists: {category.code}")

        # 2. Seed Institutions (Synthetic)
        institutions_data = [
            {
                "id": "INS-0001",
                "institution_name": "Apex Institute of Technology (Synthetic)",
                "institution_identifier": "SYN-INST-0001",
                "institution_type": "ENGINEERING_COLLEGE",
                "state": "Maharashtra",
                "city": "Pune",
                "status": "ACTIVE",
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "INS-0002",
                "institution_name": "Zenith College of Engineering (Synthetic)",
                "institution_identifier": "SYN-INST-0002",
                "institution_type": "TECHNICAL_INSTITUTE",
                "state": "Karnataka",
                "city": "Bengaluru",
                "status": "ACTIVE",
                "data_origin": "SYNTHETIC_DEMO",
            },
        ]

        for inst_data in institutions_data:
            existing = db.scalar(select(Institution).where(Institution.id == inst_data["id"]))
            if not existing:
                inst = Institution(**inst_data)
                db.add(inst)
                print(f"  + Created Institution: {inst.institution_name} [{inst.id}]")
            else:
                print(f"  * Institution exists: {existing.institution_name} [{existing.id}]")

        db.flush()

        # 3. Seed Users
        users_data = [
            {
                "id": "USR-ADMIN-01",
                "email": "admin@demo.verityai.invalid",
                "display_name": "Demo Administrator",
                "password_hash": DEMO_PASSWORD_HASH,
                "role": "ADMIN",
                "institution_id": None,
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "USR-REVIEWER-01",
                "email": "reviewer1@demo.verityai.invalid",
                "display_name": "Demo Reviewer",
                "password_hash": DEMO_PASSWORD_HASH,
                "role": "REVIEWER",
                "institution_id": None,
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "USR-INST-01",
                "email": "user1@demo.verityai.invalid",
                "display_name": "Apex Registrar",
                "password_hash": DEMO_PASSWORD_HASH,
                "role": "INSTITUTION_USER",
                "institution_id": "INS-0001",
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "USR-INST-02",
                "email": "user2@demo.verityai.invalid",
                "display_name": "Zenith Dean",
                "password_hash": DEMO_PASSWORD_HASH,
                "role": "INSTITUTION_USER",
                "institution_id": "INS-0002",
                "data_origin": "SYNTHETIC_DEMO",
            },
        ]

        for u_data in users_data:
            existing_user = db.scalar(select(User).where(User.id == u_data["id"]))
            if not existing_user:
                u = User(**u_data)
                db.add(u)
                print(f"  + Created User: {u.display_name} ({u.role})")
            else:
                print(f"  * User exists: {existing_user.display_name} ({existing_user.role})")

        db.flush()

        # 4. Seed Applications
        apps_data = [
            {
                "id": "APP-2026-0001",
                "application_reference": "VAI-2026-0001",
                "institution_id": "INS-0001",
                "category_code": "EOA_ILLUSTRATIVE",
                "academic_year": "2026-27",
                "lifecycle_status": "DRAFT",
                "pipeline_status": "NOT_STARTED",
                "declared_data": {
                    "institution_name": "Apex Institute of Technology (Synthetic)",
                    "institution_identifier": "SYN-INST-0001",
                    "certificate_number": "CERT-SYN-000123",
                    "certificate_expiry_date": "2027-03-31",
                    "programme_name": "Computer Science and Engineering",
                    "approved_intake": 120,
                },
                "created_by": "USR-INST-01",
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "APP-2026-0002",
                "application_reference": "VAI-2026-0002",
                "institution_id": "INS-0002",
                "category_code": "EOA_ILLUSTRATIVE",
                "academic_year": "2026-27",
                "lifecycle_status": "SUBMITTED",
                "pipeline_status": "NOT_STARTED",
                "declared_data": {
                    "institution_name": "Zenith College of Engineering (Synthetic)",
                    "institution_identifier": "SYN-INST-0002",
                    "certificate_number": "CERT-SYN-000456",
                    "certificate_expiry_date": "2028-06-30",
                    "programme_name": "Information Technology",
                    "approved_intake": 60,
                },
                "submitted_at": datetime.now(timezone.utc),
                "created_by": "USR-INST-02",
                "data_origin": "SYNTHETIC_DEMO",
            },
        ]

        for app_data in apps_data:
            existing_app = db.scalar(select(Application).where(Application.id == app_data["id"]))
            if not existing_app:
                app = Application(**app_data)
                db.add(app)
                db.flush()
                # Audit event for creation
                audit_event = AuditEvent(
                    id=f"AUD-{app.id}",
                    event_type="APPLICATION_CREATED",
                    actor_id=app.created_by,
                    actor_type="USER",
                    application_id=app.id,
                    metadata_json={
                        "application_reference": app.application_reference,
                        "category_code": app.category_code,
                        "institution_id": app.institution_id,
                    },
                )
                db.add(audit_event)
                print(f"  + Created Application: {app.application_reference} ({app.lifecycle_status})")
            else:
                print(f"  * Application exists: {existing_app.application_reference}")

        db.commit()
        print("✅ Seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error during seeding: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
