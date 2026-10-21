import pytest
from sqlalchemy import select
from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.audit import AuditEvent


def _setup_fixtures(db_session):
    """Seed minimal fixtures needed for tests."""
    category = ApplicationCategory(
        code="EOA_ILLUSTRATIVE",
        name="Extension of Approval (Illustrative)",
        description="Demo workflow category",
        required_document_types=["ACCREDITATION_CERTIFICATE"],
        required_declared_fields=["institution_name", "certificate_number"],
        provenance="ILLUSTRATIVE",
        enabled=True,
    )
    db_session.add(category)

    institution = Institution(
        id="INS-TEST-0001",
        institution_name="Test Institute of Technology",
        institution_identifier="SYN-INST-TEST-001",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Mumbai",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    db_session.add(institution)
    db_session.commit()
    return institution, category


def test_create_and_list_institution(client, db_session):
    """Test creating an institution and listing institutions."""
    resp = client.post(
        "/api/v1/institutions",
        json={
            "institution_name": "National Test Academy",
            "institution_identifier": "SYN-INST-TEST-002",
            "institution_type": "UNIVERSITY",
            "state": "Delhi",
            "city": "New Delhi",
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["institution_name"] == "National Test Academy"
    assert data["institution_identifier"] == "SYN-INST-TEST-002"
    assert data["id"] is not None

    # List institutions
    list_resp = client.get("/api/v1/institutions")
    assert list_resp.status_code == 200
    institutions = list_resp.json()["data"]
    assert len(institutions) == 1
    assert institutions[0]["institution_identifier"] == "SYN-INST-TEST-002"


def test_create_application_success(client, db_session):
    """Test creating a valid draft application and verifying persistence."""
    inst, cat = _setup_fixtures(db_session)

    payload = {
        "institution_id": inst.id,
        "category_code": cat.code,
        "academic_year": "2026-27",
        "declared_data": {
            "institution_name": "Test Institute of Technology",
            "certificate_number": "CERT-2026-001",
            "certificate_expiry_date": "2027-06-30",
        },
    }

    resp = client.post("/api/v1/applications", json=payload)
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["application_reference"].startswith("VAI-")
    assert data["institution_id"] == inst.id
    assert data["category_code"] == cat.code
    assert data["lifecycle_status"] == "DRAFT"
    assert data["pipeline_status"] == "NOT_STARTED"
    assert data["declared_data"]["certificate_number"] == "CERT-2026-001"

    # Verify audit event was written in the same transaction
    audit_event = db_session.scalar(
        select(AuditEvent).where(AuditEvent.application_id == data["id"])
    )
    assert audit_event is not None
    assert audit_event.event_type == "APPLICATION_CREATED"
    assert audit_event.actor_type == "USER"


def test_list_applications_with_pagination_and_filter(client, db_session):
    """Test listing applications with filtering and pagination meta."""
    inst, cat = _setup_fixtures(db_session)

    # Create two applications
    for i in range(2):
        client.post(
            "/api/v1/applications",
            json={
                "institution_id": inst.id,
                "category_code": cat.code,
                "academic_year": f"202{6+i}-2{7+i}",
                "declared_data": {"test_idx": i},
            },
        )

    # Test list endpoint
    resp = client.get("/api/v1/applications?page=1&page_size=10")
    assert resp.status_code == 200
    res_data = resp.json()
    assert len(res_data["data"]) == 2
    assert res_data["meta"]["total"] == 2
    assert res_data["meta"]["page"] == 1
    assert res_data["data"][0]["institution"]["institution_name"] == inst.institution_name


def test_get_application_detail(client, db_session):
    """Test retrieving application details by ID."""
    inst, cat = _setup_fixtures(db_session)

    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": inst.id,
            "category_code": cat.code,
            "academic_year": "2026-27",
            "declared_data": {"field_a": "value_a"},
        },
    )
    app_id = create_resp.json()["data"]["id"]

    resp = client.get(f"/api/v1/applications/{app_id}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == app_id
    assert data["institution"]["institution_name"] == inst.institution_name
    assert data["documents_summary"]["total"] == 0


def test_get_application_not_found(client, db_session):
    """Test 404 response for nonexistent application ID."""
    resp = client.get("/api/v1/applications/APP-NONEXISTENT")
    assert resp.status_code == 404
    error = resp.json()["error"]
    assert error["code"] == "APPLICATION_NOT_FOUND"


def test_create_application_nonexistent_institution(client, db_session):
    """Test 404 when institution foreign key is nonexistent."""
    _, cat = _setup_fixtures(db_session)

    resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": "INS-DOES-NOT-EXIST",
            "category_code": cat.code,
            "declared_data": {},
        },
    )
    assert resp.status_code == 404
    error = resp.json()["error"]
    assert error["code"] == "INSTITUTION_NOT_FOUND"


def test_create_application_nonexistent_category(client, db_session):
    """Test 404 when application category is nonexistent."""
    inst, _ = _setup_fixtures(db_session)

    resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": inst.id,
            "category_code": "NONEXISTENT_CATEGORY",
            "declared_data": {},
        },
    )
    assert resp.status_code == 404
    error = resp.json()["error"]
    assert error["code"] == "CATEGORY_NOT_FOUND"


def test_create_application_invalid_date_format(client, db_session):
    """Test 422 validation failure when a declared date is not YYYY-MM-DD."""
    inst, cat = _setup_fixtures(db_session)

    resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": inst.id,
            "category_code": cat.code,
            "declared_data": {
                "certificate_expiry_date": "31-03-2027",  # Invalid! Not YYYY-MM-DD
            },
        },
    )
    assert resp.status_code == 422
    error = resp.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert len(error["details"]) > 0


def test_get_application_audit_events(client, db_session):
    """Test retrieving the audit event timeline for an application."""
    inst, cat = _setup_fixtures(db_session)

    create_resp = client.post(
        "/api/v1/applications",
        json={
            "institution_id": inst.id,
            "category_code": cat.code,
            "declared_data": {},
        },
    )
    app_id = create_resp.json()["data"]["id"]

    resp = client.get(f"/api/v1/applications/{app_id}/audit-events")
    assert resp.status_code == 200
    events = resp.json()["data"]
    assert len(events) >= 1
    assert events[0]["event_type"] == "APPLICATION_CREATED"
    assert events[0]["application_id"] == app_id
