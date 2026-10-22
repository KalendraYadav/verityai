import pytest
from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.user import User
from app.models.versioning import ApplicationVersion, DocumentRevision
from app.core.security import hash_password
from app.services.versioning import (
    record_application_version,
    get_application_versions,
    get_application_version,
    compare_application_versions,
    create_initial_document_revision_if_needed,
    record_document_revision,
    get_document_revisions,
    get_application_freshness_status,
)
from app.core.exceptions import ValidationException, NotFoundException, ConflictException


@pytest.fixture
def versioning_user(db_session):
    user = db_session.get(User, "usr-ver-test")
    if not user:
        user = User(
            id="usr-ver-test",
            email="version.auditor@verityai.gov.in",
            display_name="Version Audit Officer",
            password_hash=hash_password("PassSecure123!"),
            role="ADMIN",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
    return user


@pytest.fixture
def versioning_application(db_session, versioning_user):
    inst = db_session.get(Institution, "inst-ver-001")
    if not inst:
        inst = Institution(
            id="inst-ver-001",
            institution_name="National Engineering Institute",
            institution_identifier="NEI-VER-001",
            state="Delhi",
            city="New Delhi",
            institution_type="TECHNICAL",
        )
        db_session.add(inst)

    cat = db_session.get(ApplicationCategory, "ENGG")
    if not cat:
        cat = ApplicationCategory(
            code="ENGG",
            name="Engineering & Technology",
            description="Engineering programs",
        )
        db_session.add(cat)
    db_session.commit()

    app = db_session.get(Application, "app-ver-001")
    if not app:
        app = Application(
            id="app-ver-001",
            application_reference="APP-VER-2026-001",
            institution_id=inst.id,
            category_code=cat.code,
            academic_year="2024-25",
            lifecycle_status="DRAFT",
            created_by=versioning_user.id,
            declared_data={
                "institute_name": "National Engineering Institute",
                "intake_capacity": 120,
                "head_of_institution": "Dr. A. Sharma",
                "campus_land_acres": 15.5,
            },
        )
        db_session.add(app)
        db_session.commit()
    return app


@pytest.fixture
def versioning_document(db_session, versioning_application, versioning_user):
    doc = db_session.get(Document, "doc-ver-001")
    if not doc:
        doc = Document(
            id="doc-ver-001",
            application_id=versioning_application.id,
            original_filename="land_deed_master.pdf",
            media_type="application/pdf",
            file_size_bytes=204800,
            storage_key="documents/app-ver-001/doc-ver-001_v1.pdf",
            sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            uploaded_by=versioning_user.id,
            processing_status="EXTRACTED",
        )
        db_session.add(doc)
        db_session.commit()
    return doc


def test_baseline_application_version_creation(db_session, versioning_application, versioning_user):
    """Test that querying or recording initial version creates v1 baseline snapshot."""
    # Ensure any previous version records for this app are cleaned for isolation
    db_session.query(ApplicationVersion).filter(ApplicationVersion.application_id == versioning_application.id).delete()
    db_session.commit()

    v1 = record_application_version(
        db=db_session,
        application_id=versioning_application.id,
        change_summary="Initial baseline capture",
        actor_id=versioning_user.id,
    )

    assert v1.version_number == 1
    assert v1.application_id == versioning_application.id
    assert v1.snapshot_data["application_reference"] == "APP-VER-2026-001"
    assert v1.snapshot_data["declared_data"]["intake_capacity"] == 120

    # Query versions list
    versions = get_application_versions(db_session, versioning_application.id)
    assert len(versions) >= 1
    assert any(v.version_number == 1 for v in versions)


def test_application_version_increment_on_change(db_session, versioning_application, versioning_user):
    """Test that modifying application data and recording version creates a new version with detected diff."""
    # Ensure baseline v1 exists
    v1 = record_application_version(
        db=db_session,
        application_id=versioning_application.id,
        change_summary="Initial baseline capture",
        actor_id=versioning_user.id,
    )
    assert v1.version_number == 1

    # Modify application field
    versioning_application.academic_year = "2025-26"
    new_data = dict(versioning_application.declared_data)
    new_data["intake_capacity"] = 180
    versioning_application.declared_data = new_data
    db_session.commit()

    v2 = record_application_version(
        db=db_session,
        application_id=versioning_application.id,
        change_summary="Increased intake capacity to 180 and updated academic year",
        actor_id=versioning_user.id,
    )

    assert v2.version_number == 2
    assert v2.changed_fields is not None
    assert any(k in v2.changed_fields for k in ("intake_capacity", "declared_data", "academic_year"))


def test_application_version_idempotent_suppression(db_session, versioning_application, versioning_user):
    """Test that recording a version when no fields changed suppresses duplicate version creation."""
    v1 = record_application_version(
        db=db_session,
        application_id=versioning_application.id,
        change_summary="Baseline capture",
        actor_id=versioning_user.id,
    )

    # Call record_application_version without modifying any application fields
    v_dup = record_application_version(
        db=db_session,
        application_id=versioning_application.id,
        change_summary="No changes attempt",
        actor_id=versioning_user.id,
    )

    assert v_dup.version_number == v1.version_number


def test_compare_application_versions(db_session, versioning_application, versioning_user):
    """Test comparative diff between v1 and v2."""
    v1 = record_application_version(
        db=db_session,
        application_id=versioning_application.id,
        change_summary="Baseline capture",
        actor_id=versioning_user.id,
    )

    versioning_application.academic_year = "2026-27"
    db_session.commit()

    v2 = record_application_version(
        db=db_session,
        application_id=versioning_application.id,
        change_summary="Updated academic year",
        actor_id=versioning_user.id,
    )

    comparison = compare_application_versions(
        db=db_session,
        application_id=versioning_application.id,
        v1_num=v1.version_number,
        v2_num=v2.version_number,
    )

    assert comparison["application_id"] == versioning_application.id
    assert comparison["v1_version"] == 1
    assert comparison["v2_version"] == 2
    assert comparison["changed_fields_count"] > 0

    diff_fields = {d["field"] for d in comparison["differences"] if d["is_changed"]}
    assert any("academic_year" in f for f in diff_fields)


def test_compare_invalid_version_raises(db_session, versioning_application):
    """Test comparing non-existent version raises NotFoundException."""
    with pytest.raises(NotFoundException):
        compare_application_versions(
            db=db_session,
            application_id=versioning_application.id,
            v1_num=1,
            v2_num=999,
        )


def test_document_revision_workflow(db_session, versioning_document, versioning_user):
    """Test document revision creation, listing, and duplicate SHA-256 rejection."""
    # Ensure baseline revision exists
    rev1 = create_initial_document_revision_if_needed(db_session, versioning_document)
    assert rev1.revision_number == 1
    assert rev1.sha256 == versioning_document.sha256

    # Attempt to upload amendment with identical SHA-256 (should be rejected with ConflictException)
    with pytest.raises(ConflictException) as exc_info:
        record_document_revision(
            db=db_session,
            document_id=versioning_document.id,
            original_filename="land_deed_master.pdf",
            storage_key="documents/app-ver-001/doc-ver-001_v2.pdf",
            file_size_bytes=204800,
            sha256=versioning_document.sha256,  # identical hash
            change_reason="Attempted identical file upload",
            actor_id=versioning_user.id,
        )
    assert "identical" in str(exc_info.value).lower()

    # Upload new amendment with distinct SHA-256
    rev2 = record_document_revision(
        db=db_session,
        document_id=versioning_document.id,
        original_filename="land_deed_amended.pdf",
        storage_key="documents/app-ver-001/doc-ver-001_v2.pdf",
        file_size_bytes=215000,
        sha256="a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
        change_reason="Amended land deed with municipal seal",
        actor_id=versioning_user.id,
    )
    assert rev2.revision_number == 2
    assert rev2.sha256 == "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0"

    # List document revisions
    revisions = get_document_revisions(db_session, versioning_document.id)
    assert len(revisions) == 2
    assert revisions[0].revision_number == 2  # descending order
    assert revisions[1].revision_number == 1


def test_application_freshness_status(db_session, versioning_application):
    """Test application freshness status detection."""
    freshness = get_application_freshness_status(db_session, versioning_application.id)
    assert freshness["application_id"] == versioning_application.id
    assert freshness["current_version"] >= 1
    assert "validation_status" in freshness
    assert "report_status" in freshness

