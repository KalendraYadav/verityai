import hashlib
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from argon2 import PasswordHasher
import pymupdf
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.institution import Institution
from app.models.user import User
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.processing_run import ProcessingRun
from app.models.document_page import DocumentPage
from app.models.finding import ExtractedField
from app.models.registry import RegistryRecord
from app.models.audit import AuditEvent
from app.services.storage import get_storage_root
from app.services.validation import ensure_default_rules
from app.services.integration import seed_default_portal_configs
from app.services.versioning import get_application_versions

ph = PasswordHasher()
DEMO_PASSWORD_HASH = ph.hash("demo-password-2026")
ADMIN_PASSWORD_HASH = ph.hash("AdminSecurePass123!")
REVIEWER_PASSWORD_HASH = ph.hash("ReviewerPass123!")
OPERATOR_PASSWORD_HASH = ph.hash("OperatorPass123!")


def create_demo_pdf(file_path: Path, title: str, lines: list[str]) -> tuple[int, str]:
    """Generate a clean synthetic PDF with PyMuPDF and return (size_bytes, sha256)."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4

    # Header title
    page.insert_text((50, 60), title, fontsize=14, fontname="helv", color=(0.1, 0.1, 0.4))
    page.draw_line((50, 75), (545, 75), color=(0.5, 0.5, 0.7), width=1)

    # Body lines
    y = 105
    for line in lines:
        page.insert_text((50, y), line, fontsize=10, fontname="helv", color=(0.15, 0.15, 0.2))
        y += 22

    # Footer notice
    page.draw_line((50, 780), (545, 780), color=(0.8, 0.8, 0.8), width=0.5)
    page.insert_text(
        (50, 795),
        "VerityAI Prototype Demo Document — Smart India Hackathon 2026 (Synthetic Record)",
        fontsize=8,
        fontname="helv",
        color=(0.5, 0.5, 0.5)
    )

    pdf_bytes = doc.tobytes()
    doc.close()

    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(pdf_bytes)

    sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
    return len(pdf_bytes), sha256_hash


def seed_database():
    """Idempotently seed synthetic demo institutions, users, categories, applications, and documents."""
    db = SessionLocal()
    storage_root = get_storage_root()

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
            {
                "id": "INS-0003",
                "institution_name": "Aryavart Polytechnic Institute (Synthetic)",
                "institution_identifier": "SYN-INST-0003",
                "institution_type": "POLYTECHNIC",
                "state": "Delhi",
                "city": "New Delhi",
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

        # 3. Seed Users (including quick demo switchers)
        users_data = [
            # Standard Quick-Demo Accounts
            {
                "id": "USR-ADMIN-VERITY",
                "email": "admin@verityai.gov.in",
                "display_name": "Senior Administrator (AICTE Scrutiny)",
                "password_hash": ADMIN_PASSWORD_HASH,
                "role": "ADMIN",
                "institution_id": None,
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "USR-REVIEWER-VERITY",
                "email": "reviewer@verityai.gov.in",
                "display_name": "Regulatory Scrutiny Officer",
                "password_hash": REVIEWER_PASSWORD_HASH,
                "role": "REVIEWER",
                "institution_id": None,
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "USR-OPERATOR-VERITY",
                "email": "operator@verityai.gov.in",
                "display_name": "Apex Registrar",
                "password_hash": OPERATOR_PASSWORD_HASH,
                "role": "INSTITUTION_USER",
                "institution_id": "INS-0001",
                "data_origin": "SYNTHETIC_DEMO",
            },
            # Backward-compatibility demo accounts
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
        ]

        for u_data in users_data:
            existing_user = db.scalar(select(User).where(User.email == u_data["email"]))
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
                "lifecycle_status": "SUBMITTED",
                "pipeline_status": "NOT_STARTED",
                "declared_data": {
                    "institution_name": "Apex Institute of Technology (Synthetic)",
                    "institution_identifier": "SYN-INST-0001",
                    "certificate_number": "CERT-SYN-000123",
                    "certificate_expiry_date": "2027-03-31",
                    "programme_name": "Computer Science and Engineering",
                    "approved_intake": 120,
                },
                "created_by": "USR-ADMIN-VERITY",
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "APP-2026-0002",
                "application_reference": "VAI-2026-0002",
                "institution_id": "INS-0002",
                "category_code": "EOA_ILLUSTRATIVE",
                "academic_year": "2026-27",
                "lifecycle_status": "UNDER_REVIEW",
                "pipeline_status": "NOT_STARTED",
                "declared_data": {
                    "institution_name": "Zenith College of Engineering (Synthetic)",
                    "institution_identifier": "SYN-INST-0002",
                    "certificate_number": "CERT-SYN-000456",
                    "certificate_expiry_date": "2028-06-30",
                    "programme_name": "Information Technology",
                    "approved_intake": 180,  # Intentional discrepancy: document states 120
                },
                "submitted_at": datetime.now(timezone.utc),
                "created_by": "USR-ADMIN-VERITY",
                "data_origin": "SYNTHETIC_DEMO",
            },
            {
                "id": "APP-2026-0003",
                "application_reference": "VAI-2026-0003",
                "institution_id": "INS-0003",
                "category_code": "EOA_ILLUSTRATIVE",
                "academic_year": "2026-27",
                "lifecycle_status": "DRAFT",
                "pipeline_status": "NOT_STARTED",
                "declared_data": {
                    "institution_name": "Aryavart Polytechnic Institute (Synthetic)",
                    "institution_identifier": "SYN-INST-0003",
                    "certificate_number": "CERT-SYN-000789",
                    "certificate_expiry_date": "2026-12-31",
                    "programme_name": "Civil Engineering",
                    "approved_intake": 60,
                },
                "created_by": "USR-ADMIN-VERITY",
                "data_origin": "SYNTHETIC_DEMO",
            },
        ]

        for app_data in apps_data:
            existing_app = db.scalar(select(Application).where(Application.id == app_data["id"]))
            if not existing_app:
                app = Application(**app_data)
                db.add(app)
                db.flush()

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

        db.flush()

        # 5. Seed Demonstration PDF Documents & Extracted Content
        demo_documents = [
            {
                "id": "DOC-DEMO-001",
                "application_id": "APP-2026-0001",
                "original_filename": "Apex_AICTE_Extension_of_Approval_2026.pdf",
                "storage_key": "demo_eoa_apex_2026.pdf",
                "declared_type": "ACCREDITATION_CERTIFICATE",
                "detected_type": "ACCREDITATION_CERTIFICATE",
                "effective_type": "ACCREDITATION_CERTIFICATE",
                "title": "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)",
                "lines": [
                    "APPROVAL PROCESS 2026-27 — EXTENSION OF APPROVAL (EoA)",
                    "Application Reference: VAI-2026-0001",
                    "Institution Name: Apex Institute of Technology (Synthetic)",
                    "Permanent Institute ID: SYN-INST-0001",
                    "Approved Programme: Computer Science and Engineering",
                    "Approved Intake Capacity: 120",
                    "Certificate Number: CERT-SYN-000123",
                    "Certificate Expiry Date: 2027-03-31",
                    "State: Maharashtra | City: Pune",
                    "Status: Active Approved Technical Institution",
                ],
                "clean_text": "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)\nAPPROVAL PROCESS 2026-27 — EXTENSION OF APPROVAL (EoA)\nApplication Reference: VAI-2026-0001\nInstitution Name: Apex Institute of Technology (Synthetic)\nPermanent Institute ID: SYN-INST-0001\nApproved Programme: Computer Science and Engineering\nApproved Intake Capacity: 120\nCertificate Number: CERT-SYN-000123\nCertificate Expiry Date: 2027-03-31\nState: Maharashtra | City: Pune\nStatus: Active Approved Technical Institution",
                "detected_language": "en",
            },
            {
                "id": "DOC-DEMO-002",
                "application_id": "APP-2026-0001",
                "original_filename": "Apex_Contiguous_Land_Certificate.pdf",
                "storage_key": "demo_land_apex_2026.pdf",
                "declared_type": "LAND_USE_CERTIFICATE",
                "detected_type": "LAND_USE_CERTIFICATE",
                "effective_type": "LAND_USE_CERTIFICATE",
                "title": "GOVERNMENT OF MAHARASHTRA — REVENUE DEPARTMENT",
                "lines": [
                    "LAND USE AND POSSESSION CERTIFICATE",
                    "Institution: Apex Institute of Technology (Synthetic)",
                    "Total Contiguous Campus Land Area: 5.50 Acres",
                    "Survey Number: 142/1A, Haveli, Pune",
                    "Permitted Land Use: Educational and Institutional Technical Campus",
                    "Validity: Permanent Non-Agricultural Possession",
                    "Issue Date: 2023-11-20",
                ],
                "clean_text": "GOVERNMENT OF MAHARASHTRA — REVENUE DEPARTMENT\nLAND USE AND POSSESSION CERTIFICATE\nInstitution: Apex Institute of Technology (Synthetic)\nTotal Contiguous Campus Land Area: 5.50 Acres\nSurvey Number: 142/1A, Haveli, Pune\nPermitted Land Use: Educational and Institutional Technical Campus\nValidity: Permanent Non-Agricultural Possession\nIssue Date: 2023-11-20",
                "detected_language": "en",
            },
            {
                "id": "DOC-DEMO-003",
                "application_id": "APP-2026-0002",
                "original_filename": "Zenith_Bilingual_AICTE_Approval_Devanagari.pdf",
                "storage_key": "demo_eoa_zenith_hindi.pdf",
                "declared_type": "ACCREDITATION_CERTIFICATE",
                "detected_type": "ACCREDITATION_CERTIFICATE",
                "effective_type": "ACCREDITATION_CERTIFICATE",
                "title": "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION / अखिल भारतीय तकनीकी शिक्षा परिषद",
                "lines": [
                    "वार्षिक अनुमोदन आदेश सत्र २०२६-२७ (Annual Approval Session 2026-27)",
                    "संस्थान का नाम (Institution): Zenith College of Engineering (Synthetic)",
                    "स्थायी पहचान संख्या (Institute ID): SYN-INST-0002",
                    "स्वीकृत प्रवेश क्षमता (Approved Intake): १२० (120)",
                    "प्रमाणपत्र संख्या (Certificate Number): CERT-SYN-000456",
                    "वैधता समाप्ति तिथि (Expiry Date): 2028-06-30",
                    "राज्य (State): Karnataka | शहर (City): Bengaluru",
                ],
                "clean_text": "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION / अखिल भारतीय तकनीकी शिक्षा परिषद\nवार्षिक अनुमोदन आदेश सत्र २०२६-२७ (Annual Approval Session 2026-27)\nसंस्थान का नाम (Institution): Zenith College of Engineering (Synthetic)\nस्थायी पहचान संख्या (Institute ID): SYN-INST-0002\nस्वीकृत प्रवेश क्षमता (Approved Intake): १२० (120)\nप्रमाणपत्र संख्या (Certificate Number): CERT-SYN-000456\nवैधता समाप्ति तिथि (Expiry Date): 2028-06-30\nराज्य (State): Karnataka | शहर (City): Bengaluru",
                "detected_language": "mixed",
            },
        ]

        for d_spec in demo_documents:
            existing_doc = db.scalar(select(Document).where(Document.id == d_spec["id"]))
            if not existing_doc:
                pdf_path = storage_root / d_spec["storage_key"]
                size_bytes, sha256_hash = create_demo_pdf(pdf_path, d_spec["title"], d_spec["lines"])

                doc = Document(
                    id=d_spec["id"],
                    application_id=d_spec["application_id"],
                    original_filename=d_spec["original_filename"],
                    storage_key=d_spec["storage_key"],
                    storage_backend="LOCAL",
                    file_state="PRESENT",
                    media_type="application/pdf",
                    file_size_bytes=size_bytes,
                    sha256=sha256_hash,
                    page_count=1,
                    declared_type=d_spec["declared_type"],
                    detected_type=d_spec["detected_type"],
                    effective_type=d_spec["effective_type"],
                    upload_status="ACCEPTED",
                    processing_status="COMPLETED",
                    extraction_quality_band="GOOD",
                    detected_language=d_spec["detected_language"],
                    uploaded_by="USR-ADMIN-VERITY",
                )
                db.add(doc)
                db.flush()

                # Processing Run
                run = ProcessingRun(
                    id=f"RUN-{doc.id}",
                    document_id=doc.id,
                    trigger="UPLOAD",
                    status="COMPLETED",
                    pipeline_version="1.0.0",
                    quality_summary={
                        "pages_total": 1,
                        "pages_processed": 1,
                        "extraction_quality_band": "GOOD",
                        "text_source_mix": {"DIGITAL_TEXT": 1, "OCR": 0},
                    },
                    requested_by="USR-ADMIN-VERITY",
                )
                db.add(run)
                db.flush()

                # Document Page
                page = DocumentPage(
                    id=f"PAGE-{doc.id}-1",
                    document_id=doc.id,
                    processing_run_id=run.id,
                    page_number=1,
                    text_source="DIGITAL_TEXT",
                    raw_text=d_spec["clean_text"],
                    clean_text=d_spec["clean_text"],
                    char_count=len(d_spec["clean_text"]),
                    status="SUCCEEDED",
                    detected_language=d_spec["detected_language"],
                )
                db.add(page)

                # Seed Candidate Extracted Fields
                fields = [
                    ("institution_name", "Apex Institute of Technology (Synthetic)" if "Apex" in d_spec["clean_text"] else "Zenith College of Engineering (Synthetic)"),
                    ("approved_intake", "120"),
                    ("academic_year", "2026-27"),
                    ("certificate_number", "CERT-SYN-000123" if "Apex" in d_spec["clean_text"] else "CERT-SYN-000456"),
                ]
                for f_name, f_val in fields:
                    ef = ExtractedField(
                        document_id=doc.id,
                        processing_run_id=run.id,
                        field_key=f_name,
                        raw_value=f_val,
                        normalized_value=f_val,
                        confidence=0.98,
                        page_number=1,
                    )
                    db.add(ef)

                print(f"  + Created Demo Document: {doc.original_filename} ({doc.file_size_bytes} bytes)")
            else:
                print(f"  * Document exists: {existing_doc.original_filename}")

        # 6. Seed Synthetic AISHE Reference Records
        aishe_records = [
            {
                "id": "AISHE-SYN-001",
                "provider_code": "SYNTHETIC_AISHE",
                "reference_identifier": "SYN-INST-0001",
                "institution_name": "Apex Institute of Technology",
                "institution_name_normalized": "apex",
                "state": "Maharashtra",
                "district": "Pune",
                "status": "ACTIVE",
                "approved_intake": 120,
            },
            {
                "id": "AISHE-SYN-002",
                "provider_code": "SYNTHETIC_AISHE",
                "reference_identifier": "SYN-INST-0002",
                "institution_name": "Zenith College of Engineering",
                "institution_name_normalized": "zenith",
                "state": "Karnataka",
                "district": "Bengaluru",
                "status": "ACTIVE",
                "approved_intake": 120,
            },
            {
                "id": "AISHE-SYN-003",
                "provider_code": "SYNTHETIC_AISHE",
                "reference_identifier": "SYN-INST-0003",
                "institution_name": "Aryavart Polytechnic Institute",
                "institution_name_normalized": "aryavart",
                "state": "Delhi",
                "district": "New Delhi",
                "status": "ACTIVE",
                "approved_intake": 60,
            },
        ]

        for a_spec in aishe_records:
            existing_rec = db.scalar(select(RegistryRecord).where(RegistryRecord.id == a_spec["id"]))
            if not existing_rec:
                rec = RegistryRecord(**a_spec)
                db.add(rec)
                print(f"  + Seeded AISHE Registry: {rec.institution_name} [{rec.reference_identifier}]")
            else:
                print(f"  * AISHE Record exists: {existing_rec.institution_name}")

        # 7. Seed Default Portal Gateways & Validation Rules
        seed_default_portal_configs(db)
        rules = ensure_default_rules(db)
        print(f"  + Seeded/Verified {len(rules)} Validation Rules & Portal Gateways.")

        # 8. Seed Baseline Application Versions (v1)
        for app_spec in apps_data:
            get_application_versions(db, app_spec["id"])

        db.commit()
        print("✅ Seeding completed successfully. Ready for demonstration!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error during seeding: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
