"""Tests for AICTE Regulatory Document Catalog and Category Validation.

Grounding Source: AICTE Approval Process Handbook (APH 2024-25 to 2026-27).
Tests exact official titles, citations, applicability conditions, API endpoints,
upload validation, unknown category rejection, and institutional name hygiene.
"""

import io
import pytest
from sqlalchemy.orm import Session
from app.services.document_catalog import (
    DOCUMENT_CATALOGUE,
    APPLICATION_CATEGORIES,
    resolve_document_type,
    get_catalog_entry,
    get_regulatory_document_types,
)
from app.models.institution import Institution
from app.models.application import Application
from app.models.user import User


from app.models.category import ApplicationCategory

@pytest.fixture
def test_setup(db_session: Session):
    """Seed clean fictional institutions, category, user, and test application directly into db_session."""
    cat = ApplicationCategory(
        code="EOA_TECHNICAL",
        name="Extension of Approval",
        description="EOA",
        required_document_types=["DOC_AFFIDAVIT_2"],
        required_declared_fields=["institution_name"],
        provenance="STATUTORY_APH_2024_27",
        enabled=True,
    )
    db_session.add(cat)

    user = User(
        id="USR-TEST-001",
        email="meridian.admin@verityai.gov.in",
        password_hash="fakehashdummy123",
        role="INSTITUTION_USER",
        display_name="Meridian Registrar",
        institution_id="INS-0001",
    )
    db_session.add(user)

    institutions = [
        Institution(
            id="INS-0001",
            institution_name="Meridian Institute of Technology",
            institution_identifier="VAI-I-001",
            institution_type="ENGINEERING_COLLEGE",
            state="Maharashtra",
            city="Pune",
            status="ACTIVE",
            data_origin="SYNTHETIC_DEMO",
        ),
        Institution(
            id="INS-0002",
            institution_name="Northbridge College of Engineering",
            institution_identifier="VAI-I-002",
            institution_type="ENGINEERING_COLLEGE",
            state="Karnataka",
            city="Bengaluru",
            status="ACTIVE",
            data_origin="SYNTHETIC_DEMO",
        ),
        Institution(
            id="INS-0003",
            institution_name="Aravalli School of Technical Studies",
            institution_identifier="VAI-I-003",
            institution_type="MANAGEMENT_INSTITUTE",
            state="Rajasthan",
            city="Jaipur",
            status="ACTIVE",
            data_origin="SYNTHETIC_DEMO",
        ),
        Institution(
            id="INS-0004",
            institution_name="Eastfield Institute of Applied Sciences",
            institution_identifier="VAI-I-004",
            institution_type="TECHNICAL_CAMPUS",
            state="West Bengal",
            city="Kolkata",
            status="ACTIVE",
            data_origin="SYNTHETIC_DEMO",
        ),
        Institution(
            id="INS-0005",
            institution_name="Riverstone College of Engineering",
            institution_identifier="VAI-I-005",
            institution_type="ENGINEERING_COLLEGE",
            state="Tamil Nadu",
            city="Chennai",
            status="ACTIVE",
            data_origin="SYNTHETIC_DEMO",
        ),
        Institution(
            id="INS-0006",
            institution_name="Summit Institute of Management and Technology",
            institution_identifier="VAI-I-006",
            institution_type="MANAGEMENT_INSTITUTE",
            state="Delhi",
            city="New Delhi",
            status="ACTIVE",
            data_origin="SYNTHETIC_DEMO",
        ),
    ]
    for inst in institutions:
        db_session.add(inst)

    app = Application(
        id="APP-TEST-001",
        application_reference="VAI-2026-0001",
        institution_id="INS-0001",
        category_code="EOA_TECHNICAL",
        academic_year="2026-27",
        lifecycle_status="DRAFT",
        created_by="USR-TEST-001",
    )
    db_session.add(app)
    db_session.commit()
    return {"app": app, "institutions": institutions, "user": user}


def test_annexure_2_section_2_1_official_titles_and_citations():
    """Verify exact official titles and citations for all 7 Annexure 2 Section 2.1 documents."""
    annexure_2_docs = {
        "DOC_AFFIDAVIT_2": {
            "official_ref": "Annexure 2, Section 2.1 (i)",
            "title_substr": "Affidavit 2 with digital signature",
            "stamp_substr": "e-stamp paper of Rs. 100/-",
            "mandatory": "MANDATORY",
        },
        "DOC_PAY_RECEIPT": {
            "official_ref": "Annexure 2, Section 2.1 (ii)",
            "title_substr": "pay receipt print made on AICTE Web-Portal",
            "mandatory": "CONDITIONAL",
        },
        "DOC_OCCUPANCY_CERT": {
            "official_ref": "Annexure 2, Section 2.1 (iii)",
            "title_substr": "Occupancy/ Completion Certificate/ Building License/ Form D",
            "mandatory": "MANDATORY",
        },
        "DOC_STRUCT_STABILITY": {
            "official_ref": "Annexure 2, Section 2.1 (iv)",
            "title_substr": "Structural Stability Certificate from the registered Structural Engineer",
            "condition_substr": "more than thirty years",
            "mandatory": "CONDITIONAL",
        },
        "DOC_FIRE_SAFETY": {
            "official_ref": "Annexure 2, Section 2.1 (v)",
            "title_substr": "Fire Safety Certificate issued by the Competent Authority",
            "mandatory": "MANDATORY",
        },
        "DOC_SATELLITE_MAP": {
            "official_ref": "Annexure 2, Section 2.1 (vi)",
            "title_substr": "Satellite map, using suitable Web site",
            "coords_substr": "latitude and longitude at the entrance",
            "mandatory": "MANDATORY",
        },
        "DOC_AUDITED_ACCOUNTS": {
            "official_ref": "Annexure 2, Section 2.1 (vii)",
            "title_substr": "Audited statement of accounts",
            "mandatory": "MANDATORY",
        },
    }

    for doc_code, expected in annexure_2_docs.items():
        assert doc_code in DOCUMENT_CATALOGUE, f"Missing document {doc_code}"
        entry = DOCUMENT_CATALOGUE[doc_code]

        assert expected["official_ref"] in entry["official_reference"]
        assert expected["title_substr"] in entry["official_title"]
        assert entry["mandatory_or_conditional"] == expected["mandatory"]
        assert len(entry["short_title"]) > 3
        assert len(entry["category_group"]) > 3
        assert len(entry["condition_description"]) > 10

        if "stamp_substr" in expected:
            assert expected["stamp_substr"] in entry["official_title"]
        if "condition_substr" in expected:
            assert expected["condition_substr"] in entry["official_title"]
            assert "thirty years" in entry["condition_description"]
        if "coords_substr" in expected:
            assert expected["coords_substr"] in entry["official_title"]


def test_eoa_technical_includes_all_annexure_2_items():
    """Verify EOA_TECHNICAL category includes the statutory Annexure 2.1 documents."""
    eoa_cat = APPLICATION_CATEGORIES["EOA_TECHNICAL"]
    required_docs = eoa_cat["required_document_types"]

    assert "DOC_AFFIDAVIT_2" in required_docs
    assert "DOC_PAY_RECEIPT" in required_docs
    assert "DOC_OCCUPANCY_CERT" in required_docs
    assert "DOC_STRUCT_STABILITY" in required_docs
    assert "DOC_FIRE_SAFETY" in required_docs
    assert "DOC_SATELLITE_MAP" in required_docs
    assert "DOC_AUDITED_ACCOUNTS" in required_docs


def test_regulatory_catalog_filtering():
    """Verify filtering documents by application category."""
    eoa_docs = get_regulatory_document_types("EOA_TECHNICAL")
    new_inst_docs = get_regulatory_document_types("NEW_INSTITUTION")

    eoa_codes = {d["document_code"] for d in eoa_docs}
    new_inst_codes = {d["document_code"] for d in new_inst_docs}

    # DPR is only for NEW_INSTITUTION
    assert "DOC_DPR" in new_inst_codes
    assert "DOC_DPR" not in eoa_codes

    # Fire safety is in both
    assert "DOC_FIRE_SAFETY" in new_inst_codes
    assert "DOC_FIRE_SAFETY" in eoa_codes


def test_alias_resolution_for_legacy_and_annexure_types():
    """Verify legacy aliases and new types resolve correctly to canonical codes."""
    assert resolve_document_type("BALANCE_SHEET") == "DOC_AUDITED_ACCOUNTS"
    assert resolve_document_type("AUDITED_ACCOUNTS") == "DOC_AUDITED_ACCOUNTS"
    assert resolve_document_type("LAND_DOCUMENT") == "DOC_LAND_DEED"
    assert resolve_document_type("FIRE_SAFETY_CERTIFICATE") == "DOC_FIRE_SAFETY"
    assert resolve_document_type("SATELLITE_MAP") == "DOC_SATELLITE_MAP"
    assert resolve_document_type("PAY_RECEIPT") == "DOC_PAY_RECEIPT"
    assert resolve_document_type("STRUCTURAL_STABILITY_CERTIFICATE") == "DOC_STRUCT_STABILITY"
    assert resolve_document_type("DOC_STRUCT_STAB") == "DOC_STRUCT_STABILITY"

    # Unknown category rejection
    assert resolve_document_type("INVALID_CATEGORY_XYZ") is None
    assert resolve_document_type("RANDOM_UNOFFICIAL_DOC") is None


def test_get_regulatory_catalog_api_endpoint(client):
    """Test GET /api/v1/documents/regulatory-catalog endpoint."""
    resp = client.get("/api/v1/documents/regulatory-catalog")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 28

    # Filtered
    resp_filtered = client.get("/api/v1/documents/regulatory-catalog?category_code=EOA_TECHNICAL")
    assert resp_filtered.status_code == 200
    filtered_data = resp_filtered.json()["data"]
    filtered_codes = {d["document_code"] for d in filtered_data}
    assert "DOC_AFFIDAVIT_2" in filtered_codes
    assert "DOC_AUDITED_ACCOUNTS" in filtered_codes
    assert "DOC_DPR" not in filtered_codes


def test_upload_document_rejects_invalid_category(client, db_session, test_setup):
    """Test that uploading with an invalid/unknown category raises HTTP 400 INVALID_DOCUMENT_TYPE."""
    app = test_setup["app"]

    file_content = b"%PDF-1.4 test dummy content for rejection test"
    files = {"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
    data = {"declared_type": "TOTALLY_FAKE_DOCUMENT_CATEGORY"}

    resp = client.post(
        f"/api/v1/applications/{app.id}/documents",
        files=files,
        data=data,
    )
    assert resp.status_code == 400
    body = resp.json()
    assert body["error"]["code"] == "INVALID_DOCUMENT_TYPE"


def test_upload_document_accepts_valid_category_and_alias(client, db_session, test_setup):
    """Test that uploading with a valid canonical category or recognized alias is accepted."""
    app = test_setup["app"]

    file_content = b"%PDF-1.4 valid dummy content for category acceptance"
    files = {"file": ("valid.pdf", io.BytesIO(file_content), "application/pdf")}
    data = {"declared_type": "BALANCE_SHEET"}

    resp = client.post(
        f"/api/v1/applications/{app.id}/documents",
        files=files,
        data=data,
    )
    assert resp.status_code == 202
    body = resp.json()["data"]
    assert body["upload_status"] == "ACCEPTED"


def test_fictional_institutions_hygiene(db_session, test_setup):
    """Test that all 6 fictional institutions exist with clean names and codes."""
    institutions = db_session.query(Institution).all()
    inst_names = {i.institution_name for i in institutions}

    assert "Meridian Institute of Technology" in inst_names
    assert "Northbridge College of Engineering" in inst_names
    assert "Aravalli School of Technical Studies" in inst_names
    assert "Eastfield Institute of Applied Sciences" in inst_names
    assert "Riverstone College of Engineering" in inst_names
    assert "Summit Institute of Management and Technology" in inst_names

    # Ensure no dirty strings like 'Synthetic' or '(UNIVERSITY_TECHNICAL)' in names
    for inst in institutions:
        assert "Synthetic" not in inst.institution_name
        assert "UNIVERSITY_TECHNICAL" not in inst.institution_name
        assert "EOA_TECHNICAL" not in inst.institution_name
