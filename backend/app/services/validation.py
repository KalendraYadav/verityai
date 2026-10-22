import re
from datetime import datetime, date, timezone
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.category import ApplicationCategory
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.validation import ValidationRule, ValidationRun, RuleResult
from app.services.audit import record_audit_event


# ---------------------------------------------------------------------------
# Default Synthetic Demonstration Rules
# ---------------------------------------------------------------------------
DEFAULT_SYNTHETIC_RULES: List[Dict[str, Any]] = [
    {
        "rule_code": "RULE-DOC-ACCRED",
        "rule_version": "1.0",
        "rule_name": "Accreditation Certificate Presence",
        "description": "Verifies that an Accreditation Certificate is submitted and processed for the application category.",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "REQUIRED_DOCUMENT",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "document_type": "ACCREDITATION_CERTIFICATE",
            "aliases": ["accreditation", "nba_certificate", "naac_certificate"],
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-DOC-LAND",
        "rule_version": "1.0",
        "rule_name": "Land Use Certificate Presence",
        "description": "Verifies that a valid Land Use Certificate or Land Affidavit is present for extension of approval.",
        "rule_type": "REQUIRED_DOCUMENT",
        "category": "REQUIRED_DOCUMENT",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "document_type": "LAND_USE_CERTIFICATE",
            "aliases": ["land_use", "land_affidavit", "land_ownership"],
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-FLD-CERTNO",
        "rule_version": "1.0",
        "rule_name": "Accreditation Certificate Number Extraction",
        "description": "Checks that a distinct certificate or registration number is present on the accreditation document.",
        "rule_type": "REQUIRED_FIELD",
        "category": "REQUIRED_FIELD",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "document_type": "ACCREDITATION_CERTIFICATE",
            "field_key": "certificate_number",
            "pattern": r"\b(?:cert(?:ificate)?|reg(?:istration)?|licen[sc]e|accreditation|ref(?:erence)?)\s*(?:no|number|num|id|code)?[\s.:#-]+((?=[A-Z0-9\-\/]*\d)[A-Z0-9\-\/]{3,30})\b",
        },
        "severity": "HIGH",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-EXP-ACCRED",
        "rule_version": "1.0",
        "rule_name": "Accreditation Validity & Expiry Check",
        "description": "Validates that the accreditation certificate has not expired as of the statutory evaluation date.",
        "rule_type": "EXPIRY_CHECK",
        "category": "EXPIRY",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "document_type": "ACCREDITATION_CERTIFICATE",
            "field_key": "certificate_expiry_date",
            "tolerance_days": 0,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-CMP-NAME",
        "rule_version": "1.0",
        "rule_name": "Institution Name Cross-Document Match",
        "description": "Compares declared institutional applicant name against the entity name on the supporting certificate.",
        "rule_type": "FIELD_EQUALS_APPLICATION",
        "category": "CONSISTENCY",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "app_field": "institution_name",
            "doc_field": "institution_name",
            "document_type": "ACCREDITATION_CERTIFICATE",
            "normalize_case": True,
            "normalize_whitespace": True,
        },
        "severity": "HIGH",
        "on_fail_status": "FAIL",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
    {
        "rule_code": "RULE-CMP-INTAKE",
        "rule_version": "1.0",
        "rule_name": "Approved Intake Capacity Match",
        "description": "Cross-references declared student intake capacity against evidentiary values in document text.",
        "rule_type": "FIELD_EQUALS_APPLICATION",
        "category": "CONSISTENCY",
        "applies_to": {"categories": ["EOA_ILLUSTRATIVE"]},
        "parameters": {
            "app_field": "approved_intake",
            "doc_field": "approved_intake",
            "document_type": "ACCREDITATION_CERTIFICATE",
            "is_numeric": True,
        },
        "severity": "MEDIUM",
        "on_fail_status": "NEEDS_REVIEW",
        "provenance": "SYNTHETIC_DEMO",
        "enabled": True,
    },
]


def ensure_default_rules(db: Session) -> List[ValidationRule]:
    """Ensure baseline synthetic rules exist in database."""
    rules = list(db.scalars(select(ValidationRule).order_by(ValidationRule.rule_code)).all())
    if not rules:
        for r_data in DEFAULT_SYNTHETIC_RULES:
            rule = ValidationRule(**r_data)
            db.add(rule)
        db.flush()
        rules = list(db.scalars(select(ValidationRule).order_by(ValidationRule.rule_code)).all())
    return rules


# ---------------------------------------------------------------------------
# Date Parsing & Normalization Utility
# ---------------------------------------------------------------------------
def parse_date_string(raw: Optional[str]) -> Tuple[Optional[date], bool, Optional[str]]:
    """Parse string date into date object with explicit format handling.
    Returns: (parsed_date, is_ambiguous, error_reason)
    """
    if not raw or not isinstance(raw, str) or not raw.strip():
        return None, False, "EMPTY_DATE"

    s = raw.strip()

    # 1. ISO 8601 YYYY-MM-DD
    iso_match = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", s)
    if iso_match:
        try:
            d = date(int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3)))
            return d, False, None
        except ValueError:
            return None, False, "INVALID_ISO_DATE"

    # 2. DD/MM/YYYY or DD-MM-YYYY
    dmy_match = re.search(r"\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})\b", s)
    if dmy_match:
        p1 = int(dmy_match.group(1))
        p2 = int(dmy_match.group(2))
        yr = int(dmy_match.group(3))

        # Check ambiguity if both p1 and p2 <= 12
        is_ambiguous = (1 <= p1 <= 12) and (1 <= p2 <= 12) and (p1 != p2)

        try:
            # Default to DD/MM/YYYY per Indian regulatory standards
            d = date(yr, p2, p1)
            return d, is_ambiguous, None
        except ValueError:
            try:
                d = date(yr, p1, p2)
                return d, True, None
            except ValueError:
                return None, False, "INVALID_DMY_DATE"

    # 3. Textual Month: "31 March 2027" or "March 31, 2027"
    months = {
        "jan": 1, "january": 1,
        "feb": 2, "february": 2,
        "mar": 3, "march": 3,
        "apr": 4, "april": 4,
        "may": 5,
        "jun": 6, "june": 6,
        "jul": 7, "july": 7,
        "aug": 8, "august": 8,
        "sep": 9, "september": 9,
        "oct": 10, "october": 10,
        "nov": 11, "november": 11,
        "dec": 12, "december": 12,
    }
    month_pattern = r"\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b"
    m_match = re.search(month_pattern, s)
    if m_match:
        day = int(m_match.group(1))
        m_name = m_match.group(2).lower()
        yr = int(m_match.group(3))
        if m_name in months:
            try:
                return date(yr, months[m_name], day), False, None
            except ValueError:
                return None, False, "INVALID_MONTH_DATE"

    return None, False, "UNPARSEABLE_DATE_FORMAT"


# ---------------------------------------------------------------------------
# Document Matching & Text Extraction Helpers
# ---------------------------------------------------------------------------
def find_matching_document(
    doc_type: str,
    aliases: List[str],
    documents: List[Document],
) -> Optional[Document]:
    """Find document matching a target type or its known aliases."""
    normalized_target = doc_type.upper().replace("-", "_").replace(" ", "_")
    alias_set = {a.upper().replace("-", "_").replace(" ", "_") for a in aliases}
    alias_set.add(normalized_target)

    # 1. Exact match on effective_type, declared_type, or detected_type
    for doc in documents:
        if doc.file_state == "DELETED":
            continue
        effective = (doc.effective_type or doc.declared_type or doc.detected_type or "").upper()
        if effective and effective in alias_set:
            return doc

    # 2. Check original_filename containing target tokens
    for doc in documents:
        if doc.file_state == "DELETED":
            continue
        fname = doc.original_filename.upper().replace("-", "_").replace(" ", "_")
        for alias in alias_set:
            if alias in fname:
                return doc

    return None


def extract_field_from_pages(
    field_key: str,
    doc: Document,
    pattern: Optional[str] = None,
) -> Tuple[Optional[str], Optional[int], Optional[str], Optional[float]]:
    """Scan document pages for field value using regex heuristics.
    Returns: (extracted_value, page_number, text_source, ocr_confidence)
    """
    if not doc.pages:
        return None, None, None, None

    for page in doc.pages:
        text = page.clean_text or page.raw_text
        if not text:
            continue

        if pattern:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = match.group(1).strip()
                return val, page.page_number, page.text_source, page.ocr_mean_confidence

        # Built-in field heuristics
        if field_key == "certificate_number":
            cert_match = re.search(
                r"\b(?:cert(?:ificate)?|reg(?:istration)?|licen[sc]e|accreditation|ref(?:erence)?)\s*(?:no|number|num|id|code)?[\s.:#-]+((?=[A-Z0-9\-\/]*\d)[A-Z0-9\-\/]{3,30})\b",
                text,
                re.IGNORECASE,
            )
            if cert_match:
                return cert_match.group(1).strip(), page.page_number, page.text_source, page.ocr_mean_confidence

        elif field_key in ("certificate_expiry_date", "expiry_date", "valid_until"):
            exp_match = re.search(
                r"(?:valid\s*(?:upto|until|to|through)|expiry\s*(?:date)?|expires\s*(?:on)?|validity[\s.:]*to)[\s.:#-]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})",
                text,
                re.IGNORECASE,
            )
            if exp_match:
                return exp_match.group(1).strip(), page.page_number, page.text_source, page.ocr_mean_confidence

        elif field_key in ("approved_intake", "intake"):
            intake_match = re.search(
                r"(?:approved\s*intake|intake\s*capacity|total\s*intake|intake)[\s.:#-]*([0-9]{1,4})\b",
                text,
                re.IGNORECASE,
            )
            if intake_match:
                return intake_match.group(1).strip(), page.page_number, page.text_source, page.ocr_mean_confidence

    return None, None, None, None


# ---------------------------------------------------------------------------
# Individual Rule Evaluators
# ---------------------------------------------------------------------------
def evaluate_required_document(
    rule: ValidationRule,
    app: Application,
    documents: List[Document],
    evaluation_date: date,
) -> RuleResult:
    """Rule Type A: REQUIRED_DOCUMENT"""
    params = rule.parameters or {}
    doc_type = params.get("document_type", "MANDATORY_DOCUMENT")
    aliases = params.get("aliases", [])

    matching_doc = find_matching_document(doc_type, aliases, documents)

    if matching_doc:
        target_key = f"doc:{matching_doc.id}"
        # Check processing status
        if matching_doc.processing_status in ("QUEUED", "PROCESSING"):
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=target_key,
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Required document '{doc_type}' is uploaded ({matching_doc.original_filename}) but text extraction is currently in progress ({matching_doc.processing_status}). Scrutiny cannot conclude until extraction finishes.",
                expected_value="COMPLETED",
                observed_value=matching_doc.processing_status,
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="DOCUMENT_PROCESSING_INCOMPLETE",
                evidence_payload={
                    "document_id": matching_doc.id,
                    "filename": matching_doc.original_filename,
                    "processing_status": matching_doc.processing_status,
                    "file_size_bytes": matching_doc.file_size_bytes,
                },
                evaluation_date_used=evaluation_date,
            )
        elif matching_doc.processing_status == "FAILED":
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=target_key,
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Required document '{doc_type}' is uploaded ({matching_doc.original_filename}) but automated text extraction failed. Manual review of the document file is required.",
                expected_value="COMPLETED",
                observed_value="FAILED",
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="EXTRACTION_FAILED",
                evidence_payload={
                    "document_id": matching_doc.id,
                    "filename": matching_doc.original_filename,
                    "processing_status": "FAILED",
                },
                evaluation_date_used=evaluation_date,
            )
        elif matching_doc.processing_status in ("COMPLETED", "COMPLETED_WITH_WARNINGS"):
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=target_key,
                status="PASS",
                severity=rule.severity,
                explanation=f"Mandatory document '{doc_type}' is present and processed successfully ({matching_doc.original_filename}, {matching_doc.page_count or 1} page(s)).",
                expected_value="PRESENT_AND_PROCESSED",
                observed_value="COMPLETED",
                source_document_id=matching_doc.id,
                inputs_status="ALL_AVAILABLE",
                human_review_required=False,
                evidence_payload={
                    "document_id": matching_doc.id,
                    "filename": matching_doc.original_filename,
                    "page_count": matching_doc.page_count,
                    "extraction_quality": matching_doc.extraction_quality_band,
                    "sha256": matching_doc.sha256,
                },
                evaluation_date_used=evaluation_date,
            )
        else:  # MANUAL_REVIEW_REQUIRED
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=target_key,
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Required document '{doc_type}' is present but flagged for manual review during extraction quality checks.",
                expected_value="COMPLETED",
                observed_value=matching_doc.processing_status,
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="MANUAL_REVIEW_REQUIRED",
                evidence_payload={"document_id": matching_doc.id, "filename": matching_doc.original_filename},
                evaluation_date_used=evaluation_date,
            )

    # Document missing
    # Check if other documents are still processing
    in_flight = [d for d in documents if d.processing_status in ("QUEUED", "PROCESSING") and d.file_state != "DELETED"]
    if in_flight:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"doc_type:{doc_type}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Mandatory document '{doc_type}' has not been classified yet; {len(in_flight)} uploaded document(s) are still undergoing OCR processing.",
            expected_value=f"Document matching {doc_type}",
            observed_value="NOT_FOUND_IN_FLIGHT",
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="PENDING_IN_FLIGHT_DOCUMENTS",
            evidence_payload={"expected_type": doc_type, "pending_count": len(in_flight)},
            evaluation_date_used=evaluation_date,
        )

    return RuleResult(
        rule_id=rule.id,
        application_id=app.id,
        rule_code=rule.rule_code,
        rule_version=rule.rule_version,
        rule_type=rule.rule_type,
        target_key=f"doc_type:{doc_type}",
        status=rule.on_fail_status or "FAIL",
        severity=rule.severity,
        explanation=f"Mandatory document '{doc_type}' required for application category '{app.category_code}' is missing from the institutional submission.",
        expected_value=f"Document of type {doc_type}",
        observed_value="MISSING",
        inputs_status="UNAVAILABLE",
        human_review_required=True,
        unresolved_reason="DOCUMENT_NOT_SUBMITTED",
        evidence_payload={
            "expected_type": doc_type,
            "available_types": [d.effective_type or d.declared_type for d in documents if d.file_state != "DELETED"],
        },
        evaluation_date_used=evaluation_date,
    )


def evaluate_required_field(
    rule: ValidationRule,
    app: Application,
    documents: List[Document],
    evaluation_date: date,
) -> RuleResult:
    """Rule Type B: REQUIRED_FIELD"""
    params = rule.parameters or {}
    field_key = params.get("field_key", "certificate_number")
    doc_type = params.get("document_type")
    pattern = params.get("pattern")

    # If field is expected on a document
    if doc_type:
        matching_doc = find_matching_document(doc_type, [doc_type], documents)
        if not matching_doc:
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=f"field:{field_key}",
                status="UNABLE_TO_EVALUATE",
                severity=rule.severity,
                explanation=f"Cannot evaluate required field '{field_key}'; supporting document '{doc_type}' is missing from the submission.",
                expected_value=f"Field {field_key} on {doc_type}",
                observed_value="SUPPORTING_DOC_MISSING",
                inputs_status="UNAVAILABLE",
                human_review_required=True,
                unresolved_reason="SUPPORTING_DOC_MISSING",
                evidence_payload={"field_key": field_key, "expected_document_type": doc_type},
                evaluation_date_used=evaluation_date,
            )

        if matching_doc.processing_status in ("QUEUED", "PROCESSING"):
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=f"field:{field_key}",
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Cannot evaluate field '{field_key}' because document '{matching_doc.original_filename}' is still processing ({matching_doc.processing_status}).",
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="DOCUMENT_PROCESSING_INCOMPLETE",
                evidence_payload={"document_id": matching_doc.id, "field_key": field_key},
                evaluation_date_used=evaluation_date,
            )

        extracted_val, page_num, text_src, conf = extract_field_from_pages(field_key, matching_doc, pattern)

        if extracted_val:
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=f"field:{field_key}",
                status="PASS",
                severity=rule.severity,
                explanation=f"Mandatory field '{field_key}' successfully identified on Page {page_num} of document '{matching_doc.original_filename}'.",
                expected_value=f"Identifiable {field_key}",
                observed_value=extracted_val,
                source_document_id=matching_doc.id,
                source_page_number=page_num,
                inputs_status="ALL_AVAILABLE",
                human_review_required=False,
                evidence_payload={
                    "field_key": field_key,
                    "extracted_value": extracted_val,
                    "document_id": matching_doc.id,
                    "page_number": page_num,
                    "text_source": text_src,
                    "ocr_confidence": conf,
                },
                evaluation_date_used=evaluation_date,
            )

        # Document processed but field not extracted
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"field:{field_key}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Mandatory field '{field_key}' was not found in readable text of document '{matching_doc.original_filename}'. Scrutiny official must inspect the document directly.",
            expected_value=f"Present on {matching_doc.original_filename}",
            observed_value="NOT_FOUND_IN_TEXT",
            source_document_id=matching_doc.id,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="FIELD_NOT_EXTRACTED",
            evidence_payload={
                "field_key": field_key,
                "document_id": matching_doc.id,
                "pages_examined": len(matching_doc.pages or []),
            },
            evaluation_date_used=evaluation_date,
        )

    # Field expected in declared application data
    declared_val = (app.declared_data or {}).get(field_key)
    if declared_val:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"declared_field:{field_key}",
            status="PASS",
            severity=rule.severity,
            explanation=f"Mandatory declared field '{field_key}' is present in the institutional application submission.",
            expected_value=f"Declared {field_key}",
            observed_value=str(declared_val),
            inputs_status="ALL_AVAILABLE",
            human_review_required=False,
            evidence_payload={"field_key": field_key, "declared_value": declared_val},
            evaluation_date_used=evaluation_date,
        )

    return RuleResult(
        rule_id=rule.id,
        application_id=app.id,
        rule_code=rule.rule_code,
        rule_version=rule.rule_version,
        rule_type=rule.rule_type,
        target_key=f"declared_field:{field_key}",
        status=rule.on_fail_status or "FAIL",
        severity=rule.severity,
        explanation=f"Mandatory declared field '{field_key}' is missing from the application submission data.",
        expected_value=f"Provided {field_key}",
        observed_value="NOT_PROVIDED",
        inputs_status="UNAVAILABLE",
        human_review_required=True,
        unresolved_reason="DECLARED_FIELD_MISSING",
        evidence_payload={"field_key": field_key},
        evaluation_date_used=evaluation_date,
    )


def evaluate_expiry_check(
    rule: ValidationRule,
    app: Application,
    documents: List[Document],
    evaluation_date: date,
) -> RuleResult:
    """Rule Type C: EXPIRY_CHECK"""
    params = rule.parameters or {}
    doc_type = params.get("document_type")
    field_key = params.get("field_key", "certificate_expiry_date")

    # Locate source document if specified
    matching_doc = find_matching_document(doc_type, [doc_type] if doc_type else [], documents) if doc_type else None

    # Step 1: Check document extracted text first, then declared application data
    raw_date_val: Optional[str] = None
    page_num: Optional[int] = None
    text_src: Optional[str] = None
    conf: Optional[float] = None

    if matching_doc and matching_doc.processing_status in ("COMPLETED", "COMPLETED_WITH_WARNINGS"):
        extracted_date, page_num, text_src, conf = extract_field_from_pages(field_key, matching_doc)
        if extracted_date:
            raw_date_val = extracted_date

    if not raw_date_val:
        # Fallback to application declared data
        raw_date_val = (app.declared_data or {}).get(field_key)

    if not raw_date_val:
        # If document is still processing
        if matching_doc and matching_doc.processing_status in ("QUEUED", "PROCESSING"):
            return RuleResult(
                rule_id=rule.id,
                application_id=app.id,
                rule_code=rule.rule_code,
                rule_version=rule.rule_version,
                rule_type=rule.rule_type,
                target_key=f"expiry:{doc_type or 'application'}",
                status="NEEDS_REVIEW",
                severity=rule.severity,
                explanation=f"Cannot determine expiry date; document '{matching_doc.original_filename}' is still undergoing OCR processing.",
                source_document_id=matching_doc.id,
                inputs_status="PARTIAL",
                human_review_required=True,
                unresolved_reason="DOCUMENT_PROCESSING_INCOMPLETE",
                evidence_payload={"document_id": matching_doc.id, "evaluation_date": str(evaluation_date)},
                evaluation_date_used=evaluation_date,
            )

        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Document or application does not contain an identifiable expiry date for '{doc_type or 'submission'}'; manual scrutiny required.",
            expected_value=f"Valid date >= {evaluation_date}",
            observed_value="DATE_NOT_FOUND",
            source_document_id=matching_doc.id if matching_doc else None,
            inputs_status="UNAVAILABLE",
            human_review_required=True,
            unresolved_reason="EXPIRY_DATE_NOT_FOUND",
            evidence_payload={"evaluation_date": str(evaluation_date)},
            evaluation_date_used=evaluation_date,
        )

    # Step 2: Parse Date
    parsed_dt, is_ambiguous, err = parse_date_string(str(raw_date_val))

    if err or not parsed_dt:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Observed expiry date string '{raw_date_val}' is malformed or could not be parsed into a calendar date ({err}).",
            expected_value=f"Valid ISO/DMY date >= {evaluation_date}",
            observed_value=str(raw_date_val),
            source_document_id=matching_doc.id if matching_doc else None,
            source_page_number=page_num,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="MALFORMED_DATE",
            evidence_payload={"raw_date": raw_date_val, "error": err},
            evaluation_date_used=evaluation_date,
        )

    if is_ambiguous:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Observed expiry date '{raw_date_val}' has ambiguous day/month interpretation (could be DD/MM or MM/DD). Requires reviewer confirmation.",
            expected_value=f">= {evaluation_date}",
            observed_value=str(parsed_dt),
            source_document_id=matching_doc.id if matching_doc else None,
            source_page_number=page_num,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="AMBIGUOUS_DATE_FORMAT",
            evidence_payload={"raw_date": raw_date_val, "parsed_as": str(parsed_dt)},
            evaluation_date_used=evaluation_date,
        )

    # Step 3: Compare against evaluation date
    if parsed_dt >= evaluation_date:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="PASS",
            severity=rule.severity,
            explanation=f"Document certificate is valid. Expiry date {parsed_dt} is on or after the statutory scrutiny baseline date {evaluation_date}.",
            expected_value=f">= {evaluation_date}",
            observed_value=str(parsed_dt),
            source_document_id=matching_doc.id if matching_doc else None,
            source_page_number=page_num,
            inputs_status="ALL_AVAILABLE",
            human_review_required=False,
            evidence_payload={
                "parsed_expiry_date": str(parsed_dt),
                "evaluation_baseline_date": str(evaluation_date),
                "days_remaining": (parsed_dt - evaluation_date).days,
                "text_source": text_src,
                "ocr_confidence": conf,
            },
            evaluation_date_used=evaluation_date,
        )
    else:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"expiry:{doc_type or 'application'}",
            status="FAIL",
            severity=rule.severity,
            explanation=f"Certificate has EXPIRED. Expiry date {parsed_dt} is prior to the statutory evaluation baseline date {evaluation_date} (expired {(evaluation_date - parsed_dt).days} day(s) ago).",
            expected_value=f">= {evaluation_date}",
            observed_value=str(parsed_dt),
            source_document_id=matching_doc.id if matching_doc else None,
            source_page_number=page_num,
            inputs_status="ALL_AVAILABLE",
            human_review_required=True,
            unresolved_reason="CERTIFICATE_EXPIRED",
            evidence_payload={
                "parsed_expiry_date": str(parsed_dt),
                "evaluation_baseline_date": str(evaluation_date),
                "days_expired": (evaluation_date - parsed_dt).days,
            },
            evaluation_date_used=evaluation_date,
        )


def evaluate_field_equals_application(
    rule: ValidationRule,
    app: Application,
    documents: List[Document],
    evaluation_date: date,
) -> RuleResult:
    """Rule Type D: FIELD_EQUALS_APPLICATION"""
    params = rule.parameters or {}
    app_field = params.get("app_field", "institution_name")
    doc_field = params.get("doc_field", "institution_name")
    doc_type = params.get("document_type", "ACCREDITATION_CERTIFICATE")
    normalize_case = params.get("normalize_case", True)
    normalize_whitespace = params.get("normalize_whitespace", True)
    is_numeric = params.get("is_numeric", False)

    # 1. Resolve declared application value
    declared_val: Optional[Any] = None
    if app_field == "institution_name" and app.institution:
        declared_val = app.institution.institution_name
    elif app_field == "institution_identifier" and app.institution:
        declared_val = app.institution.institution_identifier
    else:
        declared_val = (app.declared_data or {}).get(app_field)

    if declared_val is None:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="UNABLE_TO_EVALUATE",
            severity=rule.severity,
            explanation=f"Cannot perform cross-check; application declared field '{app_field}' is not provided in submission.",
            expected_value=f"Declared value for {app_field}",
            observed_value="APPLICATION_FIELD_MISSING",
            inputs_status="UNAVAILABLE",
            human_review_required=True,
            unresolved_reason="APPLICATION_FIELD_MISSING",
            evidence_payload={"app_field": app_field},
            evaluation_date_used=evaluation_date,
        )

    # 2. Resolve document
    matching_doc = find_matching_document(doc_type, [doc_type], documents)
    if not matching_doc:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="UNABLE_TO_EVALUATE",
            severity=rule.severity,
            explanation=f"Cannot compare '{app_field}'; supporting document '{doc_type}' is missing from application.",
            expected_value=str(declared_val),
            observed_value="SUPPORTING_DOC_MISSING",
            inputs_status="UNAVAILABLE",
            human_review_required=True,
            unresolved_reason="SUPPORTING_DOC_MISSING",
            evidence_payload={"app_field": app_field, "declared_value": str(declared_val)},
            evaluation_date_used=evaluation_date,
        )

    if matching_doc.processing_status in ("QUEUED", "PROCESSING"):
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Cannot compare '{app_field}'; document '{matching_doc.original_filename}' is still undergoing OCR processing ({matching_doc.processing_status}).",
            source_document_id=matching_doc.id,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="DOCUMENT_PROCESSING_INCOMPLETE",
            evidence_payload={"document_id": matching_doc.id, "app_field": app_field},
            evaluation_date_used=evaluation_date,
        )

    # 3. Extract candidate value from document
    doc_val: Optional[str] = None
    page_num: Optional[int] = None
    text_src: Optional[str] = None
    conf: Optional[float] = None

    if app_field == "institution_name":
        # Check pages for institution name appearance
        declared_str = str(declared_val).strip()
        for page in matching_doc.pages or []:
            text = page.clean_text or page.raw_text or ""
            # Search for full or clean name
            if declared_str.lower() in text.lower():
                doc_val = declared_str
                page_num = page.page_number
                text_src = page.text_source
                conf = page.ocr_mean_confidence
                break
            # Or token overlap
            tokens = [t for t in re.split(r"\W+", declared_str) if len(t) > 3]
            match_tokens = [t for t in tokens if t.lower() in text.lower()]
            if len(tokens) >= 2 and len(match_tokens) == len(tokens):
                doc_val = declared_str
                page_num = page.page_number
                text_src = page.text_source
                conf = page.ocr_mean_confidence
                break
    else:
        doc_val, page_num, text_src, conf = extract_field_from_pages(doc_field, matching_doc)

    if doc_val is None:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="NEEDS_REVIEW",
            severity=rule.severity,
            explanation=f"Could not extract candidate value for '{doc_field}' from document '{matching_doc.original_filename}' to compare with declared application value '{declared_val}'.",
            expected_value=str(declared_val),
            observed_value="CANDIDATE_VALUE_NOT_EXTRACTED",
            source_document_id=matching_doc.id,
            inputs_status="PARTIAL",
            human_review_required=True,
            unresolved_reason="EXTRACTED_VALUE_NOT_FOUND",
            evidence_payload={
                "app_field": app_field,
                "declared_value": str(declared_val),
                "document_id": matching_doc.id,
            },
            evaluation_date_used=evaluation_date,
        )

    # 4. Compare Values
    app_str = str(declared_val).strip()
    doc_str = str(doc_val).strip()

    # Numeric comparison
    if is_numeric:
        try:
            num_app = int(re.sub(r"[^\d]", "", app_str))
            num_doc = int(re.sub(r"[^\d]", "", doc_str))
            if num_app == num_doc:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"comparison:{app_field}",
                    status="PASS",
                    severity=rule.severity,
                    explanation=f"Numeric match verified for '{app_field}': declared value {num_app} matches document extracted value {num_doc} (Page {page_num or 1}).",
                    expected_value=str(num_app),
                    observed_value=str(num_doc),
                    source_document_id=matching_doc.id,
                    source_page_number=page_num,
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=False,
                    evidence_payload={
                        "app_field": app_field,
                        "declared_numeric": num_app,
                        "extracted_numeric": num_doc,
                        "document_id": matching_doc.id,
                        "page_number": page_num,
                    },
                    evaluation_date_used=evaluation_date,
                )
            else:
                return RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key=f"comparison:{app_field}",
                    status="FAIL",
                    severity=rule.severity,
                    explanation=f"Intake discrepancy detected for '{app_field}': declared value is {num_app}, but document reflects {num_doc} (Page {page_num or 1}).",
                    expected_value=str(num_app),
                    observed_value=str(num_doc),
                    source_document_id=matching_doc.id,
                    source_page_number=page_num,
                    inputs_status="ALL_AVAILABLE",
                    human_review_required=True,
                    unresolved_reason="NUMERIC_VALUE_MISMATCH",
                    evidence_payload={
                        "app_field": app_field,
                        "declared_numeric": num_app,
                        "extracted_numeric": num_doc,
                        "document_id": matching_doc.id,
                        "page_number": page_num,
                    },
                    evaluation_date_used=evaluation_date,
                )
        except (ValueError, TypeError):
            pass

    # String comparison with normalization
    cmp_app = app_str
    cmp_doc = doc_str

    if normalize_case:
        cmp_app = cmp_app.lower()
        cmp_doc = cmp_doc.lower()

    if normalize_whitespace:
        cmp_app = re.sub(r"\s+", " ", cmp_app)
        cmp_doc = re.sub(r"\s+", " ", cmp_doc)

    if cmp_app == cmp_doc:
        return RuleResult(
            rule_id=rule.id,
            application_id=app.id,
            rule_code=rule.rule_code,
            rule_version=rule.rule_version,
            rule_type=rule.rule_type,
            target_key=f"comparison:{app_field}",
            status="PASS",
            severity=rule.severity,
            explanation=f"Extracted document value '{doc_str}' exactly matches application declared value '{app_str}'.",
            expected_value=app_str,
            observed_value=doc_str,
            source_document_id=matching_doc.id,
            source_page_number=page_num,
            inputs_status="ALL_AVAILABLE",
            human_review_required=False,
            evidence_payload={
                "app_field": app_field,
                "declared_value": app_str,
                "extracted_value": doc_str,
                "document_id": matching_doc.id,
                "page_number": page_num,
                "text_source": text_src,
                "ocr_confidence": conf,
            },
            evaluation_date_used=evaluation_date,
        )

    # Discrepancy detected
    return RuleResult(
        rule_id=rule.id,
        application_id=app.id,
        rule_code=rule.rule_code,
        rule_version=rule.rule_version,
        rule_type=rule.rule_type,
        target_key=f"comparison:{app_field}",
        status="FAIL",
        severity=rule.severity,
        explanation=f"Field discrepancy detected for '{app_field}': declared value '{app_str}' does not match value '{doc_str}' extracted from document '{matching_doc.original_filename}'.",
        expected_value=app_str,
        observed_value=doc_str,
        source_document_id=matching_doc.id,
        source_page_number=page_num,
        inputs_status="ALL_AVAILABLE",
        human_review_required=True,
        unresolved_reason="FIELD_VALUE_MISMATCH",
        evidence_payload={
            "app_field": app_field,
            "declared_value": app_str,
            "extracted_value": doc_str,
            "document_id": matching_doc.id,
            "page_number": page_num,
        },
        evaluation_date_used=evaluation_date,
    )


# ---------------------------------------------------------------------------
# Validation Engine Execution
# ---------------------------------------------------------------------------
def run_application_validation(
    application_id: str,
    db: Session,
    evaluation_date: Optional[date] = None,
    triggered_by: Optional[str] = None,
    trigger: str = "MANUAL",
) -> Dict[str, Any]:
    """Execute deterministic validation engine for an application.
    Evaluates:
      1. REQUIRED_DOCUMENT
      2. REQUIRED_FIELD
      3. EXPIRY_CHECK
      4. FIELD_EQUALS_APPLICATION
    Persists ValidationRun and RuleResult records with full evidence snapshots.
    Records audit events and updates application pipeline status.
    """
    eval_dt = evaluation_date or datetime.now(timezone.utc).date()

    # 1. Fetch application and category
    app = db.scalar(select(Application).where(Application.id == application_id))
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    # 2. Fetch all documents for application
    documents = list(
        db.scalars(
            select(Document)
            .where(Document.application_id == application_id, Document.deleted_at.is_(None))
            .order_by(Document.created_at.asc())
        ).all()
    )

    # 3. Ensure rules exist
    rules = ensure_default_rules(db)

    # 4. Filter applicable rules
    applicable_rules = []
    for r in rules:
        if not r.enabled:
            continue
        applies_to = r.applies_to or {}
        cat_codes = applies_to.get("categories")
        if cat_codes and app.category_code not in cat_codes:
            continue
        applicable_rules.append(r)

    # 5. Archive prior current runs for this application
    db.execute(
        update(ValidationRun)
        .where(ValidationRun.application_id == application_id, ValidationRun.is_current.is_(True))
        .values(is_current=False)
    )

    safe_actor_id = triggered_by if (triggered_by and triggered_by != "SYSTEM") else None
    safe_actor_type = "USER" if safe_actor_id else "SYSTEM"

    # Record audit event: VALIDATION_INITIATED
    record_audit_event(
        db=db,
        event_type="VALIDATION_INITIATED",
        actor_id=safe_actor_id,
        actor_type=safe_actor_type,
        application_id=app.id,
        metadata={
            "application_reference": app.application_reference,
            "evaluation_date": str(eval_dt),
            "applicable_rules_count": len(applicable_rules),
            "trigger": trigger,
        },
    )

    # 6. Create new ValidationRun
    run = ValidationRun(
        application_id=application_id,
        status="RUNNING",
        trigger=trigger,
        evaluation_date=eval_dt,
        pipeline_version="0.2.0",
        rule_snapshot=[{"rule_code": r.rule_code, "rule_version": r.rule_version} for r in applicable_rules],
        is_current=True,
        triggered_by=safe_actor_id,
    )
    db.add(run)
    db.flush()

    # 7. Evaluate each rule
    rule_results: List[RuleResult] = []
    counts = {
        "total_rules": len(applicable_rules),
        "passed": 0,
        "failed": 0,
        "needs_review": 0,
        "not_applicable": 0,
        "unable_to_evaluate": 0,
    }

    try:
        for rule in applicable_rules:
            result: Optional[RuleResult] = None
            if rule.rule_type == "REQUIRED_DOCUMENT":
                result = evaluate_required_document(rule, app, documents, eval_dt)
            elif rule.rule_type == "REQUIRED_FIELD":
                result = evaluate_required_field(rule, app, documents, eval_dt)
            elif rule.rule_type == "EXPIRY_CHECK":
                result = evaluate_expiry_check(rule, app, documents, eval_dt)
            elif rule.rule_type == "FIELD_EQUALS_APPLICATION":
                result = evaluate_field_equals_application(rule, app, documents, eval_dt)
            else:
                # Default unknown rule handler
                result = RuleResult(
                    rule_id=rule.id,
                    application_id=app.id,
                    rule_code=rule.rule_code,
                    rule_version=rule.rule_version,
                    rule_type=rule.rule_type,
                    target_key="app",
                    status="NOT_APPLICABLE",
                    severity=rule.severity,
                    explanation=f"Rule type '{rule.rule_type}' is not applicable or not supported by engine version.",
                    inputs_status="UNAVAILABLE",
                    evaluation_date_used=eval_dt,
                )

            result.validation_run_id = run.id
            db.add(result)
            rule_results.append(result)

            # Update count summary
            st = result.status.lower()
            if st in counts:
                counts[st] += 1

        # 8. Mark run completed
        is_compliant = (
            counts["failed"] == 0
            and counts["needs_review"] == 0
            and counts["unable_to_evaluate"] == 0
            and counts["passed"] > 0
        )
        counts["is_compliant"] = is_compliant

        run.status = "COMPLETED"
        run.summary = counts
        run.completed_at = datetime.now(timezone.utc)

        # Update application pipeline status
        if counts["failed"] > 0 or counts["needs_review"] > 0:
            app.pipeline_status = "REQUIRES_REVIEW"
        elif is_compliant:
            app.pipeline_status = "VALIDATED"
        else:
            app.pipeline_status = "IN_PROGRESS"

        db.flush()

        # Record audit event: VALIDATION_COMPLETED
        record_audit_event(
            db=db,
            event_type="VALIDATION_COMPLETED",
            actor_id=safe_actor_id,
            actor_type=safe_actor_type,
            application_id=app.id,
            metadata={
                "validation_run_id": run.id,
                "summary": counts,
                "is_compliant": is_compliant,
            },
        )

        db.commit()

        return {
            "application_id": app.id,
            "validation_run_id": run.id,
            "status": run.status,
            "evaluation_date": eval_dt,
            "pipeline_version": run.pipeline_version,
            "total_rules": counts["total_rules"],
            "passed": counts["passed"],
            "failed": counts["failed"],
            "needs_review": counts["needs_review"],
            "not_applicable": counts["not_applicable"],
            "unable_to_evaluate": counts["unable_to_evaluate"],
            "is_compliant": is_compliant,
            "evaluated_at": run.completed_at,
            "results": rule_results,
        }

    except Exception as exc:
        db.rollback()
        # Record failure event
        record_audit_event(
            db=db,
            event_type="VALIDATION_FAILED",
            actor_id=safe_actor_id,
            actor_type=safe_actor_type,
            application_id=app.id,
            metadata={"error": str(exc)},
        )
        raise exc
