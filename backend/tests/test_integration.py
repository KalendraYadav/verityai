import pytest
from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.user import User
from app.models.integration import ExternalPortalConfig, ExternalPortalSyncLog
from app.core.security import hash_password
from app.services.integration import (
    validate_outbound_url,
    seed_default_portal_configs,
    get_portal_providers,
    get_portal_provider,
    check_portal_gateway_health,
    execute_external_portal_verification,
    get_integration_sync_history,
)
from app.core.exceptions import ValidationException, NotFoundException


@pytest.fixture
def integration_user(db_session):
    user = db_session.get(User, "usr-int-test")
    if not user:
        user = User(
            id="usr-int-test",
            email="integration.officer@verityai.gov.in",
            display_name="Integration Officer",
            password_hash=hash_password("PassSecure123!"),
            role="ADMIN",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
    return user


@pytest.fixture
def integration_application(db_session, integration_user):
    inst = db_session.get(Institution, "inst-int-001")
    if not inst:
        inst = Institution(
            id="inst-int-001",
            institution_name="National Engineering Institute",
            institution_identifier="NEI-INT-001",
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

    app = db_session.get(Application, "app-int-001")
    if not app:
        app = Application(
            id="app-int-001",
            application_reference="APP-INT-2026-001",
            institution_id=inst.id,
            category_code=cat.code,
            academic_year="2024-25",
            lifecycle_status="DRAFT",
            created_by=integration_user.id,
            declared_data={
                "institute_name": "National Engineering Institute",
                "intake_capacity": 120,
            },
        )
        db_session.add(app)
        db_session.commit()
    return app


def test_ssrf_validator_blocks_private_and_metadata_destinations():
    """Verify SSRF defense rejects loopback, non-HTTPS, and cloud metadata endpoints."""
    # 1. Non-HTTPS rejected
    with pytest.raises(ValidationException) as exc1:
        validate_outbound_url("http://example.com/api", allow_local_synthetic=False)
    assert "https" in str(exc1.value).lower()

    # 2. Localhost rejected
    with pytest.raises(ValidationException) as exc2:
        validate_outbound_url("https://localhost:8443/api", allow_local_synthetic=False)
    assert "ssrf" in str(exc2.value).lower()

    # 3. 127.0.0.1 loopback rejected
    with pytest.raises(ValidationException) as exc3:
        validate_outbound_url("https://127.0.0.1/api", allow_local_synthetic=False)
    assert "ssrf" in str(exc3.value).lower()

    # 4. Cloud metadata IP 169.254.169.254 rejected
    with pytest.raises(ValidationException) as exc4:
        validate_outbound_url("https://169.254.169.254/latest/meta-data", allow_local_synthetic=False)
    assert "restricted" in str(exc4.value).lower() or "ssrf" in str(exc4.value).lower()


def test_default_portal_configs_seeded(db_session):
    """Test that default regulatory portal providers are initialized with distinct categories."""
    seed_default_portal_configs(db_session)
    providers = get_portal_providers(db_session)

    assert len(providers) >= 3
    ids = {p["provider_id"] for p in providers}
    assert "LOCAL_SYNTHETIC_REGULATORY_GATEWAY" in ids
    assert "CONFIGURABLE_REST_PORTAL" in ids
    assert "OFFICIAL_AICTE_PORTAL_STUB" in ids

    # Check that official stub is explicitly unconfigured
    official = next(p for p in providers if p["provider_id"] == "OFFICIAL_AICTE_PORTAL_STUB")
    assert official["provider_type"] == "OFFICIAL_STUB"
    assert official["is_enabled"] is False
    assert "UNCONFIGURED" in official["health_status"]


def test_local_synthetic_regulatory_gateway_health_and_verification(db_session, integration_application, integration_user):
    """Test Category A local synthetic regulatory gateway operations."""
    # 1. Health probe
    health = check_portal_gateway_health(
        db=db_session,
        provider_id="LOCAL_SYNTHETIC_REGULATORY_GATEWAY",
        actor_id=integration_user.id
    )
    assert health["status"] == "OPERATIONAL"
    assert health["is_synthetic"] is True

    # 2. Clean compliance verification
    res_clean = execute_external_portal_verification(
        db=db_session,
        application_id=integration_application.id,
        provider_id="LOCAL_SYNTHETIC_REGULATORY_GATEWAY",
        actor_id=integration_user.id
    )
    assert res_clean["overall_status"] == "MATCH"
    assert res_clean["is_synthetic"] is True
    assert len(res_clean["checks"]) >= 1

    # 3. Mismatch scenario (intake > 300)
    integration_application.declared_data = {"intake_capacity": 360}
    db_session.commit()

    res_mismatch = execute_external_portal_verification(
        db=db_session,
        application_id=integration_application.id,
        provider_id="LOCAL_SYNTHETIC_REGULATORY_GATEWAY",
        actor_id=integration_user.id
    )
    assert res_mismatch["overall_status"] == "MISMATCH"
    assert any(c["status"] == "MISMATCH" for c in res_mismatch["checks"])


def test_official_aicte_portal_stub_honesty(db_session, integration_application, integration_user):
    """Test Category C statutory stub discloses missing production authorization."""
    health = check_portal_gateway_health(
        db=db_session,
        provider_id="OFFICIAL_AICTE_PORTAL_STUB",
        actor_id=integration_user.id
    )
    assert health["status"] == "UNCONFIGURED_PROTOTYPE_STUB"
    assert "pki" in health["message"].lower() or "intranet" in health["message"].lower()

    # Attempting verification must raise ValidationException with clear code
    with pytest.raises(ValidationException) as exc:
        execute_external_portal_verification(
            db=db_session,
            application_id=integration_application.id,
            provider_id="OFFICIAL_AICTE_PORTAL_STUB",
            actor_id=integration_user.id
        )
    assert "OFFICIAL_GATEWAY_UNCONFIGURED" in str(exc.value)


def test_configurable_portal_unconfigured_behavior(db_session, integration_application, integration_user):
    """Test Category B behaves safely when external URL is unconfigured."""
    detail = get_portal_provider(db_session, "CONFIGURABLE_REST_PORTAL")
    assert detail["health_status"] == "UNCONFIGURED"

    # Attempting verification when unconfigured raises ValidationException
    with pytest.raises(ValidationException) as exc:
        execute_external_portal_verification(
            db=db_session,
            application_id=integration_application.id,
            provider_id="CONFIGURABLE_REST_PORTAL",
            actor_id=integration_user.id
        )
    assert "PORTAL_NOT_CONFIGURED" in str(exc.value)


def test_integration_sync_history(db_session, integration_application, integration_user):
    """Test sync logs are created and retrievable in chronological order."""
    # Execute a health check and verification to populate logs
    check_portal_gateway_health(db=db_session, provider_id="LOCAL_SYNTHETIC_REGULATORY_GATEWAY", actor_id=integration_user.id)
    execute_external_portal_verification(
        db=db_session,
        application_id=integration_application.id,
        provider_id="LOCAL_SYNTHETIC_REGULATORY_GATEWAY",
        actor_id=integration_user.id
    )

    history = get_integration_sync_history(db_session, limit=10)
    assert len(history) >= 2
    assert any(h["action"] == "HEALTH_CHECK" for h in history)
    assert any(h["action"] == "APPLICATION_VERIFY" for h in history)
