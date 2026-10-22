import re
import uuid
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.validation import ValidationRun, RuleResult
from app.models.finding import ExtractedField, Finding, FindingEvidence
from app.services.audit import create_audit_event
from app.services.validation import parse_date_string


# ---------------------------------------------------------------------------
# Candidate Field Extraction Helpers
# ---------------------------------------------------------------------------

def extract_fields_from_document_pages(
    doc: Document,
) -> List[Dict[str, Any]]:
    """Scan all pages of a document to discover candidate fields with provenance.
    Returns list of candidate dicts ready for ExtractedField persistence.
    """
    candidates: List[Dict[str, Any]] = []
    if not doc.pages or doc.file_state == "DELETED":
        return candidates

    seen_keys = set()

    for page in doc.pages:
        text = page.clean_text or page.raw_text
        if not text:
            continue

        p_num = page.page_number
        src = page.text_source
        conf = page.ocr_mean_confidence

        # 1. Certificate Number
        if "certificate_number" not in seen_keys:
            cert_match = re.search(
                r"\b(?:cert(?:ificate)?|reg(?:istration)?|licen[sc]e|accreditation|ref(?:erence)?)\s*(?:no|number|num|id|code)?[\s.:#-]+((?=[A-Z0-9\-\/]*\d)[A-Z0-9\-\/]{3,30})\b",
                text,
                re.IGNORECASE,
            )
            if cert_match:
                raw_val = cert_match.group(1).strip()
                seen_keys.add("certificate_number")
                candidates.append({
                    "field_key": "certificate_number",
                    "raw_value": raw_val,
                    "normalized_value": raw_val.upper(),
                    "normalization_status": "OK",
                    "date_parse_status": None,
                    "page_number": p_num,
                    "extraction_method": "REGEX",
                    "confidence": conf,
                    "confidence_basis": "OCR_PAGE_MEAN" if src == "OCR" else "DIGITAL_TEXT",
                    "extraction_status": "EXTRACTED",
                })

        # 2. Expiry Date
        if "expiry_date" not in seen_keys:
            exp_match = re.search(
                r"(?:valid\s*(?:upto|until|to|through)|expiry\s*(?:date)?|expires\s*(?:on)?|validity[\s.:]*(?:to|period)?)[^\d\n]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})",
                text,
                re.IGNORECASE,
            )
            if exp_match:
                raw_val = exp_match.group(1).strip()
                parsed_d, is_ambig, parse_status = parse_date_string(raw_val)
                seen_keys.add("expiry_date")
                candidates.append({
                    "field_key": "expiry_date",
                    "raw_value": raw_val,
                    "normalized_value": parsed_d.isoformat() if parsed_d else None,
                    "normalization_status": "OK" if parsed_d and not is_ambig else ("AMBIGUOUS" if is_ambig else "UNPARSEABLE"),
                    "date_parse_status": "AMBIGUOUS" if is_ambig else ("UNAMBIGUOUS" if parsed_d else "UNPARSEABLE"),
                    "page_number": p_num,
                    "extraction_method": "REGEX",
                    "confidence": conf,
                    "confidence_basis": "OCR_PAGE_MEAN" if src == "OCR" else "DIGITAL_TEXT",
                    "extraction_status": "EXTRACTED" if parsed_d else "AMBIGUOUS",
                })

        # 3. Issue Date
        if "issue_date" not in seen_keys:
            iss_match = re.search(
                r"(?:issue\s*date|issued\s*(?:on|date)?|date\s*of\s*issue|dated)[^\d\n]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})",
                text,
                re.IGNORECASE,
            )
            if iss_match:
                raw_val = iss_match.group(1).strip()
                parsed_d, is_ambig, parse_status = parse_date_string(raw_val)
                seen_keys.add("issue_date")
                candidates.append({
                    "field_key": "issue_date",
                    "raw_value": raw_val,
                    "normalized_value": parsed_d.isoformat() if parsed_d else None,
                    "normalization_status": "OK" if parsed_d and not is_ambig else ("AMBIGUOUS" if is_ambig else "UNPARSEABLE"),
                    "date_parse_status": "AMBIGUOUS" if is_ambig else ("UNAMBIGUOUS" if parsed_d else "UNPARSEABLE"),
                    "page_number": p_num,
                    "extraction_method": "REGEX",
                    "confidence": conf,
                    "confidence_basis": "OCR_PAGE_MEAN" if src == "OCR" else "DIGITAL_TEXT",
                    "extraction_status": "EXTRACTED" if parsed_d else "AMBIGUOUS",
                })

        # 4. Approved Intake
        if "approved_intake" not in seen_keys:
            intake_match = re.search(
                r"(?:approved\s*intake|intake\s*capacity|total\s*intake|intake)[\s.:#-]*([0-9]{1,4})\b",
                text,
                re.IGNORECASE,
            )
            if intake_match:
                raw_val = intake_match.group(1).strip()
                seen_keys.add("approved_intake")
                candidates.append({
                    "field_key": "approved_intake",
                    "raw_value": raw_val,
                    "normalized_value": str(int(raw_val)),
                    "normalization_status": "OK",
                    "date_parse_status": None,
                    "page_number": p_num,
                    "extraction_method": "REGEX",
                    "confidence": conf,
                    "confidence_basis": "OCR_PAGE_MEAN" if src == "OCR" else "DIGITAL_TEXT",
                    "extraction_status": "EXTRACTED",
                })

        # 5. AISHE Code
        if "aishe_code" not in seen_keys:
            aishe_match = re.search(
                r"\b(?:AISHE|AISHE\s*Code|AISHE\s*ID)[\s.:#-]*([C]-[0-9]{4,6}|[A-Z]-[0-9]{4,6})\b",
                text,
                re.IGNORECASE,
            )
            if aishe_match:
                raw_val = aishe_match.group(1).strip()
                seen_keys.add("aishe_code")
                candidates.append({
                    "field_key": "aishe_code",
                    "raw_value": raw_val,
                    "normalized_value": raw_val.upper(),
                    "normalization_status": "OK",
                    "date_parse_status": None,
                    "page_number": p_num,
                    "extraction_method": "REGEX",
                    "confidence": conf,
                    "confidence_basis": "OCR_PAGE_MEAN" if src == "OCR" else "DIGITAL_TEXT",
                    "extraction_status": "EXTRACTED",
                })

        # 6. Institution Name (Token-based regex)
        if "institution_name" not in seen_keys:
            name_match = re.search(
                r"\b(?:name\s*of\s*(?:the)?\s*(?:institution|college|institute|university)|institution\s*name|college\s*name|institute\s*name)[\s.:#-]+([A-Za-z0-9\s,.'&-]{6,80})\b",
                text,
                re.IGNORECASE,
            )
            if not name_match:
                name_match = re.search(
                    r"(?:^|\n)\s*([A-Za-z0-9\s,.'&-]{4,60}\s+(?:Institute|College|University|Polytechnic|Academy)(?:\s+(?:of|for|in)\s+[A-Za-z0-9\s,.'&-]{3,40})?)\s*(?:\n|$)",
                    text,
                    re.IGNORECASE,
                )
            if name_match:
                raw_val = name_match.group(1).strip()
                norm_val = " ".join(raw_val.split()).upper()
                seen_keys.add("institution_name")
                candidates.append({
                    "field_key": "institution_name",
                    "raw_value": raw_val,
                    "normalized_value": norm_val,
                    "normalization_status": "OK",
                    "date_parse_status": None,
                    "page_number": p_num,
                    "extraction_method": "LABEL",
                    "confidence": conf,
                    "confidence_basis": "OCR_PAGE_MEAN" if src == "OCR" else "DIGITAL_TEXT",
                    "extraction_status": "EXTRACTED",
                })

        # 7. Academic Year
        if "academic_year" not in seen_keys:
            ay_match = re.search(
                r"\b(?:academic\s*year|session)[\s.:#-]*([0-9]{4}\s*[-–\/]\s*(?:[0-9]{2}|[0-9]{4}))\b",
                text,
                re.IGNORECASE,
            )
            if ay_match:
                raw_val = ay_match.group(1).strip()
                norm_val = re.sub(r"\s+", "", raw_val).replace("–", "-").replace("/", "-")
                seen_keys.add("academic_year")
                candidates.append({
                    "field_key": "academic_year",
                    "raw_value": raw_val,
                    "normalized_value": norm_val,
                    "normalization_status": "OK",
                    "date_parse_status": None,
                    "page_number": p_num,
                    "extraction_method": "REGEX",
                    "confidence": conf,
                    "confidence_basis": "OCR_PAGE_MEAN" if src == "OCR" else "DIGITAL_TEXT",
                    "extraction_status": "EXTRACTED",
                })

    return candidates


def persist_candidate_fields(
    doc: Document,
    candidates: List[Dict[str, Any]],
    db: Session,
) -> List[ExtractedField]:
    """Persist candidate fields, respecting manual reviewer corrections."""
    results: List[ExtractedField] = []

    # Query existing current fields for this doc
    existing_fields = list(
        db.scalars(
            select(ExtractedField).where(
                and_(
                    ExtractedField.document_id == doc.id,
                    ExtractedField.is_current == True,
                )
            )
        ).all()
    )
    existing_map = {f.field_key: f for f in existing_fields}

    for c in candidates:
        f_key = c["field_key"]
        existing = existing_map.get(f_key)

        # Do not overwrite if human reviewed or manually corrected
        if existing and existing.review_status in ("CORRECTED", "CONFIRMED"):
            results.append(existing)
            continue

        # Archive prior auto-extracted field
        if existing:
            existing.is_current = False

        new_field = ExtractedField(
            id=str(uuid.uuid4()),
            document_id=doc.id,
            field_key=f_key,
            raw_value=c.get("raw_value"),
            normalized_value=c.get("normalized_value"),
            normalization_status=c.get("normalization_status"),
            date_parse_status=c.get("date_parse_status"),
            candidate_values=c.get("candidate_values"),
            page_number=c.get("page_number"),
            extraction_method=c.get("extraction_method", "REGEX"),
            rule_or_pattern_id=c.get("rule_or_pattern_id"),
            confidence=c.get("confidence"),
            confidence_basis=c.get("confidence_basis"),
            extraction_status=c.get("extraction_status", "EXTRACTED"),
            review_status="UNREVIEWED",
            field_version=(existing.field_version + 1) if existing else 1,
            supersedes_field_id=existing.id if existing else None,
            is_current=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_field)
        results.append(new_field)

    db.flush()
    return results


# ---------------------------------------------------------------------------
# Anomaly Evaluator Engine
# ---------------------------------------------------------------------------

def run_application_analysis(
    application_id: str,
    db: Session,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Run candidate field extraction, cross-document comparison,
    and anomaly detection for an application.
    """
    app = db.get(Application, application_id)
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    create_audit_event(
        db=db,
        event_type="ANALYSIS_INITIATED",
        application_id=app.id,
        actor_id=actor_id if actor_id != "SYSTEM" else None,
        actor_type="REVIEWER" if actor_id and actor_id != "SYSTEM" else "SYSTEM",
        metadata={"trigger": "MANUAL_OR_PIPELINE"},
    )

    documents = [d for d in app.documents if d.file_state != "DELETED"]

    # 1. Extract & Persist Candidate Fields for each document
    all_extracted_fields: List[ExtractedField] = []
    for doc in documents:
        candidates = extract_fields_from_document_pages(doc)
        fields = persist_candidate_fields(doc, candidates, db)
        all_extracted_fields.extend(fields)

    # Build lookup map: doc_id -> list of current fields
    doc_fields_map: Dict[str, Dict[str, ExtractedField]] = {}
    for f in all_extracted_fields:
        if f.is_current:
            doc_fields_map.setdefault(f.document_id, {})[f.field_key] = f

    # Fetch latest validation run (if any)
    latest_val_run = db.scalars(
        select(ValidationRun)
        .where(
            and_(
                ValidationRun.application_id == app.id,
                ValidationRun.is_current == True,
            )
        )
    ).first()

    # Query existing findings for carry-over
    existing_findings = list(
        db.scalars(
            select(Finding).where(
                and_(
                    Finding.application_id == app.id,
                    Finding.is_current == True,
                )
            )
        ).all()
    )
    existing_map: Dict[str, Finding] = {f.finding_key: f for f in existing_findings}

    # Mark existing findings non-current (we will carry over review status)
    for ef in existing_findings:
        ef.is_current = False

    new_findings: List[Finding] = []

    # -----------------------------------------------------------------------
    # CHECK 1: ANM-XDOC-NAME (Cross-Document Institution Name Inconsistency)
    # -----------------------------------------------------------------------
    name_fields: List[Tuple[Document, ExtractedField]] = []
    for doc in documents:
        if doc.id in doc_fields_map and "institution_name" in doc_fields_map[doc.id]:
            name_fields.append((doc, doc_fields_map[doc.id]["institution_name"]))

    if len(name_fields) >= 2:
        for i in range(len(name_fields)):
            for j in range(i + 1, len(name_fields)):
                doc1, f1 = name_fields[i]
                doc2, f2 = name_fields[j]
                v1 = (f1.normalized_value or "").strip()
                v2 = (f2.normalized_value or "").strip()

                if v1 and v2 and v1 != v2:
                    # If neither is a clear substring of the other
                    if v1 not in v2 and v2 not in v1:
                        f_key = f"xdoc_name:{min(doc1.id, doc2.id)}:{max(doc1.id, doc2.id)}"
                        prev = existing_map.get(f_key)

                        finding = Finding(
                            id=str(uuid.uuid4()),
                            application_id=app.id,
                            document_id=doc1.id,
                            validation_run_id=latest_val_run.id if latest_val_run else None,
                            rule_code="ANM-XDOC-NAME",
                            rule_version="1.0",
                            finding_type="CROSS_DOCUMENT_MISMATCH",
                            category="CONSISTENCY",
                            indicator_id="ANM-001",
                            finding_key=f_key,
                            result_status="FAIL",
                            severity="HIGH",
                            title="Inconsistent Institution Names Across Supporting Documents",
                            explanation=(
                                f"Document '{doc1.original_filename}' (Page {f1.page_number}) references institution '{f1.raw_value}', "
                                f"whereas document '{doc2.original_filename}' (Page {f2.page_number}) references '{f2.raw_value}'. "
                                "Discrepancy must be investigated by human scrutiny officers."
                            ),
                            expected_value=v1,
                            observed_value=v2,
                            recommended_action="Inspect both original documents to confirm whether they pertain to the same institutional applicant.",
                            requires_human_review=True,
                            review_status=prev.review_status if prev else "OPEN",
                            review_comment=prev.review_comment if prev else None,
                            reviewed_by=prev.reviewed_by if prev else None,
                            reviewed_at=prev.reviewed_at if prev else None,
                            carried_over_from_finding_id=prev.id if prev else None,
                            is_current=True,
                            detection_method="DETERMINISTIC_HEURISTIC",
                        )

                        ev1 = FindingEvidence(
                            id=str(uuid.uuid4()),
                            finding_id=finding.id,
                            sort_order=1,
                            evidence_type="DOCUMENT_FIELD",
                            label=f"Institution name in {doc1.original_filename}",
                            document_id=doc1.id,
                            field_id=f1.id,
                            page_number=f1.page_number,
                            raw_value=f1.raw_value,
                            normalized_value=f1.normalized_value,
                            snapshot={"field_key": "institution_name", "filename": doc1.original_filename},
                        )
                        ev2 = FindingEvidence(
                            id=str(uuid.uuid4()),
                            finding_id=finding.id,
                            sort_order=2,
                            evidence_type="DOCUMENT_FIELD",
                            label=f"Institution name in {doc2.original_filename}",
                            document_id=doc2.id,
                            field_id=f2.id,
                            page_number=f2.page_number,
                            raw_value=f2.raw_value,
                            normalized_value=f2.normalized_value,
                            snapshot={"field_key": "institution_name", "filename": doc2.original_filename},
                        )
                        finding.evidence_items.extend([ev1, ev2])
                        new_findings.append(finding)

    # -----------------------------------------------------------------------
    # CHECK 2: ANM-XDOC-INTAKE (Conflicting Approved Intake Figures)
    # -----------------------------------------------------------------------
    intake_fields: List[Tuple[Document, ExtractedField]] = []
    for doc in documents:
        if doc.id in doc_fields_map and "approved_intake" in doc_fields_map[doc.id]:
            intake_fields.append((doc, doc_fields_map[doc.id]["approved_intake"]))

    if len(intake_fields) >= 2:
        for i in range(len(intake_fields)):
            for j in range(i + 1, len(intake_fields)):
                doc1, f1 = intake_fields[i]
                doc2, f2 = intake_fields[j]
                v1 = (f1.normalized_value or "").strip()
                v2 = (f2.normalized_value or "").strip()

                if v1 and v2 and v1 != v2:
                    f_key = f"xdoc_intake:{min(doc1.id, doc2.id)}:{max(doc1.id, doc2.id)}"
                    prev = existing_map.get(f_key)

                    finding = Finding(
                        id=str(uuid.uuid4()),
                        application_id=app.id,
                        document_id=doc1.id,
                        validation_run_id=latest_val_run.id if latest_val_run else None,
                        rule_code="ANM-XDOC-INTAKE",
                        rule_version="1.0",
                        finding_type="CROSS_DOCUMENT_MISMATCH",
                        category="CONSISTENCY",
                        indicator_id="ANM-002",
                        finding_key=f_key,
                        result_status="FAIL",
                        severity="HIGH",
                        title="Conflicting Student Intake Capacities Across Documents",
                        explanation=(
                            f"Document '{doc1.original_filename}' records approved intake capacity of {f1.raw_value}, "
                            f"whereas document '{doc2.original_filename}' indicates capacity of {f2.raw_value}."
                        ),
                        expected_value=v1,
                        observed_value=v2,
                        recommended_action="Verify AICTE approval letter and institutional inspection report to confirm sanctioned intake.",
                        requires_human_review=True,
                        review_status=prev.review_status if prev else "OPEN",
                        review_comment=prev.review_comment if prev else None,
                        reviewed_by=prev.reviewed_by if prev else None,
                        reviewed_at=prev.reviewed_at if prev else None,
                        carried_over_from_finding_id=prev.id if prev else None,
                        is_current=True,
                        detection_method="DETERMINISTIC_HEURISTIC",
                    )
                    ev1 = FindingEvidence(
                        id=str(uuid.uuid4()),
                        finding_id=finding.id,
                        sort_order=1,
                        evidence_type="DOCUMENT_FIELD",
                        label=f"Intake capacity on {doc1.original_filename} (Page {f1.page_number})",
                        document_id=doc1.id,
                        field_id=f1.id,
                        page_number=f1.page_number,
                        raw_value=f1.raw_value,
                        normalized_value=f1.normalized_value,
                        snapshot={"field_key": "approved_intake"},
                    )
                    ev2 = FindingEvidence(
                        id=str(uuid.uuid4()),
                        finding_id=finding.id,
                        sort_order=2,
                        evidence_type="DOCUMENT_FIELD",
                        label=f"Intake capacity on {doc2.original_filename} (Page {f2.page_number})",
                        document_id=doc2.id,
                        field_id=f2.id,
                        page_number=f2.page_number,
                        raw_value=f2.raw_value,
                        normalized_value=f2.normalized_value,
                        snapshot={"field_key": "approved_intake"},
                    )
                    finding.evidence_items.extend([ev1, ev2])
                    new_findings.append(finding)

    # -----------------------------------------------------------------------
    # CHECK 3: ANM-DATE-SANITY (Inverted Dates or Ambiguities)
    # -----------------------------------------------------------------------
    for doc in documents:
        if doc.id in doc_fields_map:
            doc_f = doc_fields_map[doc.id]
            iss_f = doc_f.get("issue_date")
            exp_f = doc_f.get("expiry_date")

            # Inverted dates: issue_date > expiry_date
            if iss_f and exp_f and iss_f.normalized_value and exp_f.normalized_value:
                try:
                    d_iss = date.fromisoformat(iss_f.normalized_value)
                    d_exp = date.fromisoformat(exp_f.normalized_value)
                    if d_iss > d_exp:
                        f_key = f"date_sanity_inv:{doc.id}"
                        prev = existing_map.get(f_key)

                        finding = Finding(
                            id=str(uuid.uuid4()),
                            application_id=app.id,
                            document_id=doc.id,
                            validation_run_id=latest_val_run.id if latest_val_run else None,
                            rule_code="ANM-DATE-SANITY",
                            rule_version="1.0",
                            finding_type="INDICATOR",
                            category="DATE_SANITY",
                            indicator_id="ANM-003",
                            finding_key=f_key,
                            result_status="FAIL",
                            severity="CRITICAL",
                            title=f"Chronological Date Inversion in {doc.original_filename}",
                            explanation=(
                                f"In document '{doc.original_filename}', the recorded Issue Date ({iss_f.raw_value}) "
                                f"is chronologically after the Expiry Date ({exp_f.raw_value}). "
                                "This is a serious evidentiary contradiction requiring immediate scrutiny."
                            ),
                            expected_value=f"Issue Date ≤ Expiry Date ({exp_f.normalized_value})",
                            observed_value=f"Issue Date: {iss_f.normalized_value}",
                            recommended_action="Examine original physical certificate for typographical errors or potential tampering.",
                            requires_human_review=True,
                            review_status=prev.review_status if prev else "OPEN",
                            review_comment=prev.review_comment if prev else None,
                            reviewed_by=prev.reviewed_by if prev else None,
                            reviewed_at=prev.reviewed_at if prev else None,
                            carried_over_from_finding_id=prev.id if prev else None,
                            is_current=True,
                            detection_method="DETERMINISTIC_HEURISTIC",
                        )
                        ev1 = FindingEvidence(
                            id=str(uuid.uuid4()),
                            finding_id=finding.id,
                            sort_order=1,
                            evidence_type="DOCUMENT_FIELD",
                            label="Issue Date",
                            document_id=doc.id,
                            field_id=iss_f.id,
                            page_number=iss_f.page_number,
                            raw_value=iss_f.raw_value,
                            normalized_value=iss_f.normalized_value,
                            snapshot={"field_key": "issue_date"},
                        )
                        ev2 = FindingEvidence(
                            id=str(uuid.uuid4()),
                            finding_id=finding.id,
                            sort_order=2,
                            evidence_type="DOCUMENT_FIELD",
                            label="Expiry Date",
                            document_id=doc.id,
                            field_id=exp_f.id,
                            page_number=exp_f.page_number,
                            raw_value=exp_f.raw_value,
                            normalized_value=exp_f.normalized_value,
                            snapshot={"field_key": "expiry_date"},
                        )
                        finding.evidence_items.extend([ev1, ev2])
                        new_findings.append(finding)
                except Exception:
                    pass

            # Ambiguous date detection
            for df in (iss_f, exp_f):
                if df and df.date_parse_status == "AMBIGUOUS":
                    f_key = f"date_ambig:{doc.id}:{df.field_key}"
                    prev = existing_map.get(f_key)

                    finding = Finding(
                        id=str(uuid.uuid4()),
                        application_id=app.id,
                        document_id=doc.id,
                        validation_run_id=latest_val_run.id if latest_val_run else None,
                        rule_code="ANM-DATE-AMBIGUOUS",
                        rule_version="1.0",
                        finding_type="INDICATOR",
                        category="DATE_SANITY",
                        indicator_id="ANM-004",
                        finding_key=f_key,
                        result_status="NEEDS_REVIEW",
                        severity="MEDIUM",
                        title=f"Ambiguous Date Notation in {doc.original_filename}",
                        explanation=(
                            f"The {df.field_key.replace('_', ' ')} '{df.raw_value}' on Page {df.page_number} "
                            "uses an ambiguous numeric format where month and day can be inverted (e.g. DD/MM vs MM/DD). "
                            "Scrutiny officer should adjudicate the exact calendar date."
                        ),
                        expected_value="Unambiguous date format (e.g. YYYY-MM-DD or DD Month YYYY)",
                        observed_value=df.raw_value,
                        recommended_action="Inspect document context and issuance jurisdiction date conventions.",
                        requires_human_review=True,
                        review_status=prev.review_status if prev else "OPEN",
                        review_comment=prev.review_comment if prev else None,
                        reviewed_by=prev.reviewed_by if prev else None,
                        reviewed_at=prev.reviewed_at if prev else None,
                        carried_over_from_finding_id=prev.id if prev else None,
                        is_current=True,
                        detection_method="DETERMINISTIC_HEURISTIC",
                    )
                    ev = FindingEvidence(
                        id=str(uuid.uuid4()),
                        finding_id=finding.id,
                        sort_order=1,
                        evidence_type="DOCUMENT_FIELD",
                        label=f"Ambiguous {df.field_key}",
                        document_id=doc.id,
                        field_id=df.id,
                        page_number=df.page_number,
                        raw_value=df.raw_value,
                        normalized_value=df.normalized_value,
                        snapshot={"field_key": df.field_key, "raw_value": df.raw_value},
                    )
                    finding.evidence_items.append(ev)
                    new_findings.append(finding)

    # -----------------------------------------------------------------------
    # CHECK 4: ANM-DUPLICATE-FILE (Duplicate Document Hash Collisions)
    # -----------------------------------------------------------------------
    seen_hashes: Dict[str, Document] = {}
    for doc in documents:
        if not doc.sha256:
            continue
        if doc.sha256 in seen_hashes:
            dup_doc = seen_hashes[doc.sha256]
            f_key = f"dup_hash:{min(doc.id, dup_doc.id)}:{max(doc.id, dup_doc.id)}"
            prev = existing_map.get(f_key)

            finding = Finding(
                id=str(uuid.uuid4()),
                application_id=app.id,
                document_id=doc.id,
                validation_run_id=latest_val_run.id if latest_val_run else None,
                rule_code="ANM-DUPLICATE-FILE",
                rule_version="1.0",
                finding_type="INDICATOR",
                category="DUPLICATE",
                indicator_id="ANM-005",
                finding_key=f_key,
                result_status="NEEDS_REVIEW",
                severity="HIGH",
                title=f"Duplicate Document Content Detected ({doc.original_filename})",
                explanation=(
                    f"Cryptographic SHA-256 collision: document '{doc.original_filename}' is byte-for-byte identical "
                    f"to '{dup_doc.original_filename}' (SHA: {doc.sha256[:16]}...). "
                    "This indicates either accidental re-upload or duplicate evidentiary submission."
                ),
                expected_value="Distinct evidentiary document submissions",
                observed_value=f"Identical SHA-256 hash: {doc.sha256[:16]}...",
                recommended_action="Verify whether applicant accidentally uploaded the same file under two categories.",
                requires_human_review=True,
                review_status=prev.review_status if prev else "OPEN",
                review_comment=prev.review_comment if prev else None,
                reviewed_by=prev.reviewed_by if prev else None,
                reviewed_at=prev.reviewed_at if prev else None,
                carried_over_from_finding_id=prev.id if prev else None,
                is_current=True,
                detection_method="DETERMINISTIC_HEURISTIC",
            )
            ev1 = FindingEvidence(
                id=str(uuid.uuid4()),
                finding_id=finding.id,
                sort_order=1,
                evidence_type="FILE_HASH",
                label=f"File hash of {doc.original_filename}",
                document_id=doc.id,
                raw_value=doc.sha256,
                normalized_value=doc.sha256,
                snapshot={"filename": doc.original_filename, "sha256": doc.sha256},
            )
            ev2 = FindingEvidence(
                id=str(uuid.uuid4()),
                finding_id=finding.id,
                sort_order=2,
                evidence_type="FILE_HASH",
                label=f"File hash of {dup_doc.original_filename}",
                document_id=dup_doc.id,
                raw_value=dup_doc.sha256,
                normalized_value=dup_doc.sha256,
                snapshot={"filename": dup_doc.original_filename, "sha256": dup_doc.sha256},
            )
            finding.evidence_items.extend([ev1, ev2])
            new_findings.append(finding)
        else:
            seen_hashes[doc.sha256] = doc

    # -----------------------------------------------------------------------
    # CHECK 5: ANM-EXTRACTION-QUALITY (Degraded / Unreadable OCR)
    # -----------------------------------------------------------------------
    for doc in documents:
        if doc.processing_status in ("MANUAL_REVIEW_REQUIRED", "FAILED") or doc.extraction_quality_band in ("POOR", "UNUSABLE"):
            f_key = f"qual_degraded:{doc.id}"
            prev = existing_map.get(f_key)

            finding = Finding(
                id=str(uuid.uuid4()),
                application_id=app.id,
                document_id=doc.id,
                validation_run_id=latest_val_run.id if latest_val_run else None,
                rule_code="ANM-EXTRACTION-QUALITY",
                rule_version="1.0",
                finding_type="QUALITY_WARNING",
                category="EXTRACTION_QUALITY",
                indicator_id="ANM-006",
                finding_key=f_key,
                result_status="NEEDS_REVIEW",
                severity="MEDIUM",
                title=f"Degraded Text Extraction Quality: {doc.original_filename}",
                explanation=(
                    f"Document '{doc.original_filename}' completed text extraction with quality band '{doc.extraction_quality_band or 'UNKNOWN'}' "
                    f"(status: {doc.processing_status}). OCR confidence is too low or text is illegible, preventing complete automated scrutiny."
                ),
                expected_value="GOOD or FAIR extraction quality",
                observed_value=f"Status: {doc.processing_status}, Band: {doc.extraction_quality_band}",
                recommended_action="Inspect source document manually or request a higher-resolution scan from the applicant institution.",
                requires_human_review=True,
                review_status=prev.review_status if prev else "OPEN",
                review_comment=prev.review_comment if prev else None,
                reviewed_by=prev.reviewed_by if prev else None,
                reviewed_at=prev.reviewed_at if prev else None,
                carried_over_from_finding_id=prev.id if prev else None,
                is_current=True,
                detection_method="DETERMINISTIC_HEURISTIC",
            )
            ev = FindingEvidence(
                id=str(uuid.uuid4()),
                finding_id=finding.id,
                sort_order=1,
                evidence_type="EXTRACTION_STATE",
                label=f"Quality metrics for {doc.original_filename}",
                document_id=doc.id,
                raw_value=doc.processing_status,
                normalized_value=doc.extraction_quality_band,
                snapshot={
                    "filename": doc.original_filename,
                    "processing_status": doc.processing_status,
                    "quality_band": doc.extraction_quality_band,
                },
            )
            finding.evidence_items.append(ev)
            new_findings.append(finding)

    # Persist all findings and evidence
    for f in new_findings:
        db.add(f)

    db.commit()

    create_audit_event(
        db=db,
        event_type="ANALYSIS_COMPLETED",
        application_id=app.id,
        actor_id=actor_id if actor_id != "SYSTEM" else None,
        actor_type="REVIEWER" if actor_id and actor_id != "SYSTEM" else "SYSTEM",
        metadata={
            "total_findings": len(new_findings),
            "high_severity": sum(1 for f in new_findings if f.severity in ("HIGH", "CRITICAL")),
            "extracted_fields_count": len(all_extracted_fields),
        },
    )

    # Return summary structure
    open_count = sum(1 for f in new_findings if f.review_status == "OPEN")
    confirmed_count = sum(1 for f in new_findings if f.review_status == "CONFIRMED")
    dismissed_count = sum(1 for f in new_findings if f.review_status == "DISMISSED")
    resolved_count = sum(1 for f in new_findings if f.review_status == "RESOLVED")

    sev_breakdown = {}
    for f in new_findings:
        sev_breakdown[f.severity] = sev_breakdown.get(f.severity, 0) + 1

    cat_breakdown = {}
    for f in new_findings:
        cat_breakdown[f.category] = cat_breakdown.get(f.category, 0) + 1

    return {
        "application_id": app.id,
        "total_anomalies": len(new_findings),
        "open_findings": open_count,
        "confirmed_findings": confirmed_count,
        "dismissed_findings": dismissed_count,
        "resolved_findings": resolved_count,
        "severity_breakdown": sev_breakdown,
        "category_breakdown": cat_breakdown,
        "ai_advisory_status": "LOCAL_DETERMINISTIC_ACTIVE",
        "ai_advisory_message": "Deterministic cross-document and anomaly detection active. Optional cloud LLM disabled.",
        "findings": new_findings,
        "extracted_fields": [f for f in all_extracted_fields if f.is_current],
    }


def review_finding(
    finding_id: str,
    review_status: str,
    comment: Optional[str],
    reviewer_id: Optional[str],
    db: Session,
) -> Finding:
    """Record reviewer outcome for a finding."""
    valid_statuses = ("OPEN", "UNDER_REVIEW", "CONFIRMED", "DISMISSED", "RESOLVED", "AWAITING_EVIDENCE")
    if review_status not in valid_statuses:
        raise ValueError(f"Invalid review_status '{review_status}'. Allowed: {', '.join(valid_statuses)}")

    finding = db.get(Finding, finding_id)
    if not finding:
        raise ValueError(f"Finding {finding_id} not found.")

    finding.review_status = review_status
    if comment:
        finding.review_comment = comment
    if reviewer_id:
        finding.reviewed_by = reviewer_id
    finding.reviewed_at = datetime.now(timezone.utc)
    finding.updated_at = datetime.now(timezone.utc)

    create_audit_event(
        db=db,
        event_type="FINDING_REVIEWED",
        application_id=finding.application_id,
        document_id=finding.document_id,
        actor_id=reviewer_id,
        actor_type="REVIEWER",
        metadata={
            "finding_id": finding.id,
            "rule_code": finding.rule_code,
            "new_status": review_status,
            "comment": comment,
        },
    )

    db.commit()
    db.refresh(finding)
    return finding
