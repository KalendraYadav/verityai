"""Tests for Phase B: Regulatory Knowledge Grounding & Document Catalogue.

Validates statutory document types, application categories, statutory AICTE rules,
source traceability, and idempotent database rule seeding.
"""

import pytest
from sqlalchemy import select
from app.services.document_catalog import (
    APPLICATION_CATEGORIES,
    DOCUMENT_CATALOG,
    resolve_document_type,
    get_catalog_entry,
    get_required_documents_for_category,
)
from app.services.validation import (
    DEFAULT_SYNTHETIC_RULES,
    STATUTORY_AICTE_RULES,
    ALL_SYSTEM_RULES,
    ensure_default_rules,
)
from app.models.validation import ValidationRule


def test_application_categories_completeness():
    """Verify all 5 application categories are registered with complete metadata."""
    expected_categories = [
        "NEW_INSTITUTION",
        "EOA_TECHNICAL",
        "STANDALONE_PGDM",
        "UNIVERSITY_TECHNICAL",
        "EOA_ILLUSTRATIVE",
    ]
    for cat_code in expected_categories:
        assert cat_code in APPLICATION_CATEGORIES, f"Missing category: {cat_code}"
        cat = APPLICATION_CATEGORIES[cat_code]
        assert cat["code"] == cat_code
        assert len(cat["name"]) > 5
        assert len(cat["description"]) > 10
        assert len(cat["required_document_types"]) > 0
        assert len(cat["required_declared_fields"]) > 0
        assert cat["provenance"] in ["STATUTORY_APH_2024_27", "SYNTHETIC_DEMO", "ILLUSTRATIVE"]


def test_document_master_catalog_statutory_types():
    """Verify all statutory document types are registered with APH 2024-27 citations."""
    assert len(DOCUMENT_CATALOG) >= 28, f"Expected at least 28 statutory document types, got {len(DOCUMENT_CATALOG)}"

    # Verify Annexure 2 Section 2.1 additions
    assert "DOC_PAY_RECEIPT" in DOCUMENT_CATALOG
    assert "DOC_SATELLITE_MAP" in DOCUMENT_CATALOG
    assert "DOC_AUDITED_ACCOUNTS" in DOCUMENT_CATALOG

    for doc_code, doc in DOCUMENT_CATALOG.items():
        assert doc["document_code"] == doc_code
        assert len(doc["name"]) > 5
        assert len(doc.get("short_title", "")) > 3
        assert len(doc.get("official_title", "")) > 10
        assert len(doc.get("category_group", "")) > 3
        assert doc["pdf_page"] > 0
        assert len(doc["official_reference"]) > 0
        assert len(doc["issuing_authority"]) > 0
        assert doc["verification_status"] == "VERIFIED"
        assert len(doc["applicable_categories"]) > 0


def test_resolve_document_type():
    """Test alias resolution for statutory document types."""
    # Direct canonical code
    assert resolve_document_type("DOC_FIRE_SAFETY") == "DOC_FIRE_SAFETY"
    assert resolve_document_type("DOC_BUILDING_PLAN") == "DOC_BUILDING_PLAN"

    # Known aliases
    assert resolve_document_type("fire_noc") == "DOC_FIRE_SAFETY"
    assert resolve_document_type("fire_certificate") == "DOC_FIRE_SAFETY"
    assert resolve_document_type("sanctioned_building_plan") == "DOC_BUILDING_PLAN"
    assert resolve_document_type("architect_certificate") == "DOC_CERTIFICATE_2"

    # Unknown
    assert resolve_document_type("unknown_random_doc_type") is None


def test_statutory_aicte_rules_traceability():
    """Verify that all 20 statutory rules possess verifiable citations and attributes."""
    assert len(STATUTORY_AICTE_RULES) == 20, f"Expected 20 statutory rules, got {len(STATUTORY_AICTE_RULES)}"
    assert len(ALL_SYSTEM_RULES) == 26  # 6 synthetic + 20 statutory

    for rule in STATUTORY_AICTE_RULES:
        assert rule["rule_code"].startswith("RULE-STAT-")
        assert rule["provenance"] == "STATUTORY_APH_2024_27"
        assert rule["severity"] in ["LOW", "MEDIUM", "HIGH"]
        assert rule["on_fail_status"] in ["FAIL", "NEEDS_REVIEW"]
        assert "categories" in rule["applies_to"]
        assert len(rule["applies_to"]["categories"]) > 0

        # Parameter traceability
        params = rule["parameters"]
        assert "source_document" in params and params["source_document"] == "AICTE_APH_2024-27.pdf"
        assert "clause" in params and len(params["clause"]) > 0
        assert "pdf_page" in params and params["pdf_page"] > 0
        assert "requirement_id" in params and params["requirement_id"].startswith("REQ-")


def test_ensure_default_rules_idempotent(db_session):
    """Verify that rule seeding is idempotent and seeds both synthetic and statutory rules."""
    # First call
    rules_first = ensure_default_rules(db_session)
    assert len(rules_first) >= 26

    # Verify presence in database
    db_rules = list(db_session.scalars(select(ValidationRule)).all())
    assert len(db_rules) >= 26

    # Second call should not create duplicates
    rules_second = ensure_default_rules(db_session)
    assert len(rules_second) == len(rules_first)

    # Check statutory vs synthetic separation
    statutory_codes = {r.rule_code for r in db_rules if r.provenance == "STATUTORY_APH_2024_27"}
    synthetic_codes = {r.rule_code for r in db_rules if r.provenance == "SYNTHETIC_DEMO"}
    assert len(statutory_codes) == 20
    assert len(synthetic_codes) == 6
