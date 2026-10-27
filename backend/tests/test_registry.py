import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.registry import RegistryRecord, RegistryVerificationRun, RegistryVerificationResult
from app.services.registry import normalize_institution_name, import_registry_dataset, verify_application_registry
from app.core.security import hash_password


from app.core.security import hash_password, create_access_token


@pytest.fixture
def registry_user(client: TestClient, db_session: Session):
    user = db_session.get(User, "usr-reg-test")
    if not user:
        user = User(
            id="usr-reg-test",
            email="reg.officer@verityai.gov.in",
            display_name="Registry Officer",
            password_hash=hash_password("PassSecure123!"),
            role="ADMIN",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

    token = create_access_token(user.id, user.role, user.email)
    client.cookies.set("access_token", token)
    client.headers["X-Requested-With"] = "VerityAI"
    return user


@pytest.fixture
def registry_category(db_session: Session):
    cat = db_session.get(ApplicationCategory, "CAT_REG_TEST")
    if not cat:
        cat = ApplicationCategory(
            code="CAT_REG_TEST",
            name="Regulatory Verification Test Category",
            enabled=True,
        )
        db_session.add(cat)
        db_session.commit()
    return cat


def test_name_normalization():
    assert normalize_institution_name("Institute of Technology and Sciences") == ""
    assert normalize_institution_name("Apex Institute of Engineering & Technology") == "apex"
    assert normalize_institution_name("St. Xavier's Polytechnic College") == "st xavier s"
    assert normalize_institution_name("Kalinga Institute of Industrial Technology") == "kalinga industrial"


def test_registry_provider_listing(client: TestClient):
    resp = client.get("/api/v1/registry/providers")
    assert resp.status_code == 200
    providers = resp.json()
    assert len(providers) >= 2
    codes = [p["provider_code"] for p in providers]
    assert "SYNTHETIC_AISHE" in codes
    assert "OFFICIAL_AICTE" in codes
    official = next(p for p in providers if p["provider_code"] == "OFFICIAL_AICTE")
    assert official["is_available"] is False
    assert official["status"] == "NOT_CONFIGURED"


def test_registry_import_and_deduplication(client: TestClient, db_session: Session, registry_user: User):
    payload = {
        "provider_code": "SYNTHETIC_AISHE",
        "source_dataset": "AISHE_MOCK_2026",
        "dataset_version": "1.0",
        "records": [
            {
                "reference_identifier": "AISHE-C-1001",
                "institution_name": "Delhi Technical Campus",
                "state": "Delhi",
                "district": "New Delhi",
                "status": "ACTIVE",
                "approved_intake": 420
            },
            {
                "reference_identifier": "AISHE-C-1002",
                "institution_name": "Maharashtra Institute of Technology",
                "state": "Maharashtra",
                "district": "Pune",
                "status": "ACTIVE",
                "approved_intake": 600
            }
        ]
    }
    resp = client.post("/api/v1/registry/imports", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["created_count"] == 2
    assert data["total_processed"] == 2

    # Safe repeat import updates existing
    payload["records"][0]["approved_intake"] = 480
    resp2 = client.post("/api/v1/registry/imports", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["created_count"] == 0
    assert data2["updated_count"] == 2


def test_registry_import_duplicate_in_batch_rejected(client: TestClient, registry_user: User):
    payload = {
        "provider_code": "SYNTHETIC_AISHE",
        "records": [
            {"reference_identifier": "AISHE-DUP-1", "institution_name": "Inst A"},
            {"reference_identifier": "AISHE-DUP-1", "institution_name": "Inst B"}
        ]
    }
    resp = client.post("/api/v1/registry/imports", json=payload)
    assert resp.status_code == 422


def test_registry_verification_exact_match(client: TestClient, db_session: Session, registry_user: User, registry_category: ApplicationCategory):
    inst = Institution(
        institution_name="National Engineering Institute",
        institution_identifier="AISHE-NEI-999",
        state="Karnataka",
        city="Bengaluru"
    )
    db_session.add(inst)
    db_session.commit()

    app = Application(
        institution_id=inst.id,
        category_code=registry_category.code,
        academic_year="2026-2027",
        application_reference="VERITY-2026-NEI",
        created_by=registry_user.id,
        declared_data={"declared_intake": 300}
    )
    db_session.add(app)
    db_session.commit()

    # Import reference record
    import_registry_dataset(
        db=db_session,
        records_data=[
            {
                "reference_identifier": "AISHE-NEI-999",
                "institution_name": "National Engineering Institute",
                "state": "Karnataka",
                "district": "Bengaluru",
                "status": "ACTIVE",
                "approved_intake": 360
            }
        ],
        provider_code="SYNTHETIC_AISHE"
    )

    # Run verification via API
    resp = client.post(f"/api/v1/applications/{app.id}/registry-verification", json={"provider_code": "SYNTHETIC_AISHE"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_status"] == "MATCH"
    assert len(data["results"]) >= 4

    checks = {r["check_type"]: r["status"] for r in data["results"]}
    assert checks["IDENTIFIER_MATCH"] == "MATCH"
    assert checks["NAME_MATCH"] == "MATCH"
    assert checks["REGISTRATION_STATUS"] == "MATCH"
    assert checks["INTAKE_CEILING"] == "MATCH"


def test_registry_verification_mismatch_and_stale(client: TestClient, db_session: Session, registry_user: User, registry_category: ApplicationCategory):
    inst = Institution(
        institution_name="Sunrise College of Tech",
        institution_identifier="AISHE-SUN-001",
        state="Tamil Nadu"
    )
    db_session.add(inst)
    db_session.commit()

    app = Application(
        institution_id=inst.id,
        category_code=registry_category.code,
        academic_year="2026-2027",
        application_reference="VERITY-2026-SUN",
        created_by=registry_user.id,
        declared_data={"declared_intake": 500}  # Exceeds reference approved intake 200
    )
    db_session.add(app)
    db_session.commit()

    import_registry_dataset(
        db=db_session,
        records_data=[
            {
                "reference_identifier": "AISHE-SUN-001",
                "institution_name": "Sunrise College of Tech",
                "state": "Tamil Nadu",
                "status": "SUSPENDED",
                "approved_intake": 200,
                "is_stale": True
            }
        ],
        provider_code="SYNTHETIC_AISHE"
    )

    resp = client.post(f"/api/v1/applications/{app.id}/registry-verification", json={"provider_code": "SYNTHETIC_AISHE"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_status"] == "MISMATCH"

    checks = {r["check_type"]: r["status"] for r in data["results"]}
    assert checks["REGISTRATION_STATUS"] == "MISMATCH"
    assert checks["INTAKE_CEILING"] == "MISMATCH"
    assert checks["REFERENCE_FRESHNESS"] == "STALE_REFERENCE"


def test_registry_verification_not_found(client: TestClient, db_session: Session, registry_user: User, registry_category: ApplicationCategory):
    inst = Institution(
        institution_name="Unknown Unregistered Academy",
        institution_identifier="AISHE-UNKNOWN-888"
    )
    db_session.add(inst)
    db_session.commit()

    app = Application(
        institution_id=inst.id,
        category_code=registry_category.code,
        academic_year="2026-2027",
        application_reference="VERITY-2026-UNK",
        created_by=registry_user.id
    )
    db_session.add(app)
    db_session.commit()

    resp = client.post(f"/api/v1/applications/{app.id}/registry-verification", json={"provider_code": "SYNTHETIC_AISHE"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_status"] == "NOT_FOUND"


def test_registry_verification_official_provider_unavailable(client: TestClient, db_session: Session, registry_user: User, registry_category: ApplicationCategory):
    inst = Institution(institution_name="Test Inst", institution_identifier="AICTE-1-1")
    db_session.add(inst)
    db_session.commit()
    app = Application(
        institution_id=inst.id,
        category_code=registry_category.code,
        academic_year="2026-2027",
        application_reference="VERITY-TEST",
        created_by=registry_user.id
    )
    db_session.add(app)
    db_session.commit()

    resp = client.post(f"/api/v1/applications/{app.id}/registry-verification", json={"provider_code": "OFFICIAL_AICTE"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_status"] == "PROVIDER_UNAVAILABLE"


def test_discrepancy_resolution(client: TestClient, db_session: Session, registry_user: User, registry_category: ApplicationCategory):
    inst = Institution(institution_name="Resolvable Inst", institution_identifier="RES-001")
    db_session.add(inst)
    db_session.commit()
    app = Application(
        institution_id=inst.id,
        category_code=registry_category.code,
        academic_year="2026-2027",
        application_reference="VERITY-RES",
        created_by=registry_user.id
    )
    db_session.add(app)
    db_session.commit()

    run = verify_application_registry(db_session, app.id, "SYNTHETIC_AISHE")
    assert len(run.results) > 0
    result_id = run.results[0].id

    # Resolve discrepancy via API
    resolve_payload = {
        "resolution_status": "ACCEPTED",
        "resolution_notes": "Verified against physical gazette notification by reviewer."
    }
    resp = client.patch(f"/api/v1/registry-verification/{result_id}/resolve", json=resolve_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resolution_status"] == "ACCEPTED"
    assert data["resolution_notes"] == "Verified against physical gazette notification by reviewer."
