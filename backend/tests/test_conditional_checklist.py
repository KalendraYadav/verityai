"""Tests for Phase C: Conditional Checklist and Application Workflow.

Validates application-specific dynamic checklist generation, conditional rules
(land lease, building age, intake increase, foreign collaboration), and REST endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.institution import Institution
from app.models.document import Document
from app.models.user import User
from app.models.category import ApplicationCategory
from app.services.workflow import evaluate_conditional_checklist, get_application_readiness
from app.services.document_catalog import APPLICATION_CATEGORIES
from argon2 import PasswordHasher


@pytest.fixture
def conditional_apps(db_session: Session):
    """Fixture creating synthetic applications with varying declared conditions."""
    # Ensure application categories exist for foreign keys
    for cat_code, cat_info in APPLICATION_CATEGORIES.items():
        existing_cat = db_session.get(ApplicationCategory, cat_code)
        if not existing_cat:
            c = ApplicationCategory(
                code=cat_code,
                name=cat_info["name"],
                description=cat_info["description"],
                required_document_types=cat_info["required_document_types"],
                required_declared_fields=cat_info["required_declared_fields"],
                provenance=cat_info["provenance"],
                enabled=cat_info["enabled"],
            )
            db_session.add(c)
    db_session.flush()

    inst = Institution(
        id="INST-CHECKLIST-01",
        institution_name="Conditional Test Technical Campus (Synthetic)",
        institution_identifier="SYN-COND-01",
        institution_type="ENGINEERING_COLLEGE",
        state="Maharashtra",
        city="Pune",
        status="ACTIVE",
        data_origin="SYNTHETIC_DEMO",
    )
    user = User(
        id="USER-COND-01",
        email="registrar@conditional.test",
        password_hash=PasswordHasher().hash("Pass123!"),
        display_name="Conditional Registrar",
        role="INSTITUTION_USER",
        institution_id=inst.id,
        is_active=True,
    )
    db_session.add_all([inst, user])
    db_session.flush()

    # App 1: New Institution with Owned Land & New Buildings
    app1 = Application(
        id="APP-COND-NEW-OWNED",
        application_reference="VAI-2026-COND-01",
        institution_id=inst.id,
        category_code="NEW_INSTITUTION",
        academic_year="2026-27",
        lifecycle_status="DRAFT",
        pipeline_status="INITIAL",
        created_by=user.id,
        declared_data={
            "institution_name": inst.institution_name,
            "land_ownership": "OWNED",
            "building_age_years": 2,
            "applying_intake_expansion": False,
            "foreign_collaboration": False,
        },
    )

    # App 2: New Institution with Leased Land & Aged Building (>30 yrs)
    app2 = Application(
        id="APP-COND-NEW-LEASED-AGED",
        application_reference="VAI-2026-COND-02",
        institution_id=inst.id,
        category_code="NEW_INSTITUTION",
        academic_year="2026-27",
        lifecycle_status="DRAFT",
        pipeline_status="INITIAL",
        created_by=user.id,
        declared_data={
            "institution_name": inst.institution_name,
            "land_ownership": "LEASED",
            "lease_duration_years": 35,
            "building_age_years": 35,
            "online_evc": True,
            "foreign_collaboration": True,
        },
    )

    # App 3: EoA with Intake Expansion
    app3 = Application(
        id="APP-COND-EOA-EXPANSION",
        application_reference="VAI-2026-COND-03",
        institution_id=inst.id,
        category_code="EOA_TECHNICAL",
        academic_year="2026-27",
        lifecycle_status="DRAFT",
        pipeline_status="INITIAL",
        created_by=user.id,
        declared_data={
            "institution_name": inst.institution_name,
            "applying_intake_expansion": True,
            "seeking_extended_eoa": True,
        },
    )

    db_session.add_all([app1, app2, app3])
    db_session.commit()

    return {
        "institution": inst,
        "user": user,
        "app_owned": app1,
        "app_leased_aged": app2,
        "app_eoa_expansion": app3,
    }


def test_new_institution_owned_land_checklist(db_session: Session, conditional_apps):
    """Test checklist for new institution with owned land and young buildings."""
    app = conditional_apps["app_owned"]
    checklist = evaluate_conditional_checklist(db_session, app.id)

    assert checklist.category_code == "NEW_INSTITUTION"
    assert checklist.total_required > 5

    items_by_code = {it.document_code: it for it in checklist.items}

    # Mandatory Chapter I documents must be required
    assert "DOC_DPR" in items_by_code
    assert items_by_code["DOC_DPR"].mandatory_or_conditional == "MANDATORY"
    assert items_by_code["DOC_DPR"].status == "REQUIRED_MISSING"

    # Aged building structural stability should be NOT_APPLICABLE
    assert "DOC_STRUCT_STAB" in items_by_code
    assert items_by_code["DOC_STRUCT_STAB"].status == "NOT_APPLICABLE"

    # Foreign MoU should be NOT_APPLICABLE
    assert "DOC_FOREIGN_MOU" in items_by_code
    assert items_by_code["DOC_FOREIGN_MOU"].status == "NOT_APPLICABLE"


def test_new_institution_leased_and_aged_building_triggers(db_session: Session, conditional_apps):
    """Test conditional activation of lease encumbrance, aged building stability, and video tour."""
    app = conditional_apps["app_leased_aged"]
    checklist = evaluate_conditional_checklist(db_session, app.id)

    items_by_code = {it.document_code: it for it in checklist.items}

    # Leased land triggers Encumbrance Certificate
    assert "DOC_ENCUMBRANCE" in items_by_code
    encumbrance_item = items_by_code["DOC_ENCUMBRANCE"]
    assert encumbrance_item.status in ("REQUIRED_MISSING", "CONDITIONAL_NEEDS_REVIEW")
    assert "leased" in encumbrance_item.activating_condition.lower()

    # Building age > 30 years triggers Structural Stability Certificate
    assert "DOC_STRUCT_STAB" in items_by_code
    stab_item = items_by_code["DOC_STRUCT_STAB"]
    assert stab_item.status == "CONDITIONAL_NEEDS_REVIEW"
    assert "35" in stab_item.activating_condition or "30" in stab_item.activating_condition
    assert stab_item.source_clause == "Clause 6.17 (h)"

    # Online EVC triggers 30-min Video tour
    assert "DOC_EVC_VIDEO" in items_by_code
    video_item = items_by_code["DOC_EVC_VIDEO"]
    assert video_item.status == "CONDITIONAL_NEEDS_REVIEW"
    assert "expert visit committee" in video_item.activating_condition.lower()

    # Foreign collaboration triggers Bipartite MoU
    assert "DOC_FOREIGN_MOU" in items_by_code
    mou_item = items_by_code["DOC_FOREIGN_MOU"]
    assert mou_item.status == "CONDITIONAL_NEEDS_REVIEW"


def test_eoa_intake_expansion_triggers(db_session: Session, conditional_apps):
    """Test that intake expansion triggers Trust Resolution (Format 3) and Architect Certificate 2."""
    app = conditional_apps["app_eoa_expansion"]
    checklist = evaluate_conditional_checklist(db_session, app.id)

    items_by_code = {it.document_code: it for it in checklist.items}

    # Trust Resolution triggered for intake expansion
    assert "DOC_FORMAT_3" in items_by_code
    res_item = items_by_code["DOC_FORMAT_3"]
    assert res_item.status in ("REQUIRED_MISSING", "CONDITIONAL_NEEDS_REVIEW")
    assert "intake" in res_item.activating_condition.lower()

    # Certificate 2 triggered for space expansion
    assert "DOC_CERTIFICATE_2" in items_by_code
    cert2_item = items_by_code["DOC_CERTIFICATE_2"]
    assert cert2_item.status in ("REQUIRED_MISSING", "CONDITIONAL_NEEDS_REVIEW")

    # Accreditation triggered for 3-year extension
    assert "DOC_ACCRED_CERT" in items_by_code
    accred_item = items_by_code["DOC_ACCRED_CERT"]
    assert accred_item.mandatory_or_conditional == "MANDATORY"


def test_uploaded_document_updates_checklist_status(db_session: Session, conditional_apps):
    """Test that uploading a matching document changes its status from MISSING to REQUIRED_UPLOADED."""
    app = conditional_apps["app_owned"]
    user = conditional_apps["user"]

    # Upload Fire Safety document
    doc = Document(
        application_id=app.id,
        original_filename="Fire_Safety_NOC_2026.pdf",
        storage_key="stored_fire_noc_key",
        storage_backend="LOCAL",
        file_size_bytes=1024,
        sha256="fake_sha256_fire_noc_key",
        media_type="application/pdf",
        declared_type="DOC_FIRE_SAFETY",
        effective_type="DOC_FIRE_SAFETY",
        processing_status="COMPLETED",
        uploaded_by=user.id,
    )
    db_session.add(doc)
    db_session.commit()

    checklist = evaluate_conditional_checklist(db_session, app.id)
    items_by_code = {it.document_code: it for it in checklist.items}

    fire_item = items_by_code["DOC_FIRE_SAFETY"]
    assert fire_item.is_present is True
    assert fire_item.status == "REQUIRED_UPLOADED"
    assert fire_item.uploaded_document_id == doc.id
    assert fire_item.uploaded_document_name == "Fire_Safety_NOC_2026.pdf"


def test_checklist_and_readiness_rest_endpoints(client: TestClient, conditional_apps):
    """Test REST API endpoints for checklist retrieval."""
    app = conditional_apps["app_leased_aged"]
    user = conditional_apps["user"]
    from app.core.security import create_access_token
    token = create_access_token(user.id, user.role, user.email, extra_claims={"institution_id": user.institution_id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET /api/v1/applications/{app_id}/checklist
    res = client.get(f"/api/v1/applications/{app.id}/checklist", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["application_id"] == app.id
    assert data["category_code"] == "NEW_INSTITUTION"
    assert len(data["items"]) > 0

    # 2. GET /api/v1/applications/{app_id}/readiness (includes checklist)
    res_ready = client.get(f"/api/v1/applications/{app.id}/readiness", headers=headers)
    assert res_ready.status_code == 200
    ready_data = res_ready.json()["data"]
    assert "checklist" in ready_data
    assert ready_data["checklist"]["category_code"] == "NEW_INSTITUTION"
    assert ready_data["document_readiness"]["complete"] is False
