import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import json

import pymupdf as fitz
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.models.application import Application
from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.validation import ValidationRun, RuleResult, ValidationRule
from app.models.finding import Finding, FindingEvidence, ExtractedField
from app.models.audit import AuditEvent
from app.models.report import ScrutinyReport
from app.models.user import User


def get_application_review_summary(db: Session, application_id: str) -> Optional[Dict[str, Any]]:
    """
    Consolidates comprehensive decision support data for an application:
    - Metadata and current status
    - Documents processing state and missing required types
    - Validation rule results with explainable breakdown
    - Anomaly findings with evidence citations
    - Consolidated evidence traceability items
    - Actionable recommendations based on explicit conditions
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        return None

    # Institution and category
    inst = db.query(Institution).filter(Institution.id == app.institution_id).first() if app.institution_id else None
    cat = db.query(ApplicationCategory).filter(ApplicationCategory.code == app.category_code).first() if app.category_code else None

    # Documents
    docs = db.query(Document).filter(Document.application_id == application_id).all()
    doc_map = {d.id: d for d in docs}
    doc_types_uploaded = {d.effective_type or d.declared_type for d in docs if (d.effective_type or d.declared_type)}
    
    required_types = []
    if cat and cat.required_document_types:
        try:
            required_types = json.loads(cat.required_document_types) if isinstance(cat.required_document_types, str) else cat.required_document_types
        except Exception:
            required_types = []
    
    missing_docs = [rt for rt in required_types if rt not in doc_types_uploaded]
    processed_count = sum(1 for d in docs if d.processing_status in ("COMPLETED", "PROCESSED", "COMPLETED_WITH_WARNINGS"))

    documents_summary = {
        "total_documents": len(docs),
        "processed_documents": processed_count,
        "missing_required_types": missing_docs,
        "is_complete": len(missing_docs) == 0,
    }

    # Latest Validation Run
    latest_val_run = (
        db.query(ValidationRun)
        .filter(ValidationRun.application_id == application_id)
        .order_by(desc(ValidationRun.started_at))
        .first()
    )

    validation_summary = {
        "run_id": latest_val_run.id if latest_val_run else None,
        "evaluated_at": latest_val_run.started_at if latest_val_run else None,
        "total_rules": 0,
        "passed": 0,
        "failed": 0,
        "needs_review": 0,
        "unable_to_evaluate": 0,
    }

    rule_explanations = []
    if latest_val_run:
        results = db.query(RuleResult).filter(RuleResult.validation_run_id == latest_val_run.id).all()
        validation_summary["total_rules"] = len(results)
        for r in results:
            st = r.status.upper()
            if st in ("PASSED", "PASS"):
                validation_summary["passed"] += 1
            elif st in ("FAILED", "FAIL"):
                validation_summary["failed"] += 1
            elif st == "NEEDS_REVIEW":
                validation_summary["needs_review"] += 1
            elif st in ("UNABLE_TO_EVALUATE", "INCONCLUSIVE"):
                validation_summary["unable_to_evaluate"] += 1

            rule = db.query(ValidationRule).filter(ValidationRule.id == r.rule_id).first() if r.rule_id else None
            rule_code = r.rule_code or (rule.rule_code if rule else "UNKNOWN")
            rule_name = (rule.rule_name if rule else rule_code)
            rule_type = r.rule_type or (rule.rule_type if rule else "DETERMINISTIC")

            source_doc = doc_map.get(r.source_document_id)
            doc_name = source_doc.original_filename if source_doc else None

            purpose = f"Evaluate compliance with rule {rule_code}"
            expected = r.expected_value or "Satisfy regulatory criteria"
            observed = r.observed_value or r.explanation or "Evaluation complete"

            limitation = None
            recommendation = None
            if st in ("FAILED", "FAIL"):
                recommendation = "Investigate discrepancy between declared value and submitted documentation."
            elif st == "NEEDS_REVIEW":
                limitation = "Automated check detected boundary condition requiring human interpretation."
                recommendation = "Review primary document evidence before taking adverse action."
            elif st in ("UNABLE_TO_EVALUATE", "INCONCLUSIVE"):
                limitation = "Insufficient extraction data or missing required supporting document."
                recommendation = "Request document re-upload or perform manual inspection."

            rule_explanations.append({
                "rule_code": rule_code,
                "name": rule_name,
                "rule_type": rule_type,
                "status": st,
                "purpose": purpose,
                "expected": expected,
                "observed": observed,
                "evidence_source": f"Doc {doc_name or r.source_document_id}, Page {r.source_page_number}" if r.source_document_id else "Application record",
                "document_name": doc_name,
                "page_number": r.source_page_number,
                "evaluated_at": r.evaluated_at,
                "limitation_or_uncertainty": limitation,
                "recommendation": recommendation,
            })

    # Anomaly Findings
    findings = db.query(Finding).filter(Finding.application_id == application_id, Finding.is_current == True).all()
    open_findings = sum(1 for f in findings if f.review_status in ("OPEN", "UNDER_REVIEW"))
    confirmed_findings = sum(1 for f in findings if f.review_status == "CONFIRMED")
    dismissed_findings = sum(1 for f in findings if f.review_status == "DISMISSED")

    anomaly_summary = {
        "total_findings": len(findings),
        "open_findings": open_findings,
        "confirmed_findings": confirmed_findings,
        "dismissed_findings": dismissed_findings,
    }

    anomalies_list = []
    evidence_items = []

    for f in findings:
        ev_records = db.query(FindingEvidence).filter(FindingEvidence.finding_id == f.id).order_by(FindingEvidence.sort_order).all()
        f_evidence = []
        for ev in ev_records:
            d = doc_map.get(ev.document_id)
            d_name = d.original_filename if d else None
            declared_val = ev.snapshot.get("declared_value") if isinstance(ev.snapshot, dict) else None
            obs_val = ev.normalized_value or ev.raw_value

            f_evidence.append({
                "document_id": ev.document_id,
                "document_name": d_name,
                "page_number": ev.page_number,
                "field_key": ev.label,
                "extracted_value": obs_val,
                "declared_value": declared_val,
                "source_type": ev.evidence_type,
                "comparison_note": ev.label,
            })
            evidence_items.append({
                "id": str(uuid.uuid4()),
                "application_id": application_id,
                "document_id": ev.document_id,
                "document_name": d_name,
                "page_number": ev.page_number,
                "field_key": ev.label,
                "declared_value": declared_val,
                "observed_value": obs_val,
                "comparison_note": ev.label,
                "source": f"Finding: {f.rule_code}",
                "timestamp": ev.captured_at,
            })

        anomalies_list.append({
            "finding_id": f.id,
            "finding_code": f.rule_code,
            "category": f.category,
            "severity": f.severity,
            "status": f.review_status,
            "title": f.title,
            "description": f.explanation,
            "source_agent": f.detection_method,
            "confidence_score": 1.0,
            "evidence": f_evidence,
            "suggested_action": f.recommended_action,
        })

    # Actionable Recommendations
    recommendations = []
    if missing_docs:
        recommendations.append({
            "action_type": "MISSING_DOCUMENT",
            "priority": "HIGH",
            "title": "Request Missing Supporting Documents",
            "description": f"Mandatory document types missing: {', '.join(missing_docs)}. Application cannot be cleared without them.",
            "reference_id": None,
        })

    if validation_summary["failed"] > 0:
        recommendations.append({
            "action_type": "RESOLVE_VALIDATION",
            "priority": "HIGH",
            "title": f"Scrutinize {validation_summary['failed']} Validation Failure(s)",
            "description": "Deterministic validation identified regulatory criteria failures. Verify source evidence.",
            "reference_id": None,
        })

    if open_findings > 0:
        recommendations.append({
            "action_type": "REVIEW_ANOMALY",
            "priority": "HIGH",
            "title": f"Review {open_findings} Open Anomaly Findings",
            "description": "Cross-document or field-level anomalies require human reviewer determination.",
            "reference_id": None,
        })

    if validation_summary["needs_review"] > 0 or validation_summary["unable_to_evaluate"] > 0:
        recommendations.append({
            "action_type": "INSPECT_PAGE",
            "priority": "MEDIUM",
            "title": "Inspect Document Pages with Inconclusive Extraction",
            "description": "Certain automated checks could not reach conclusive results from OCR text alone.",
            "reference_id": None,
        })

    if not recommendations and app.lifecycle_status == "UNDER_SCRUTINY":
        recommendations.append({
            "action_type": "RECORD_DECISION",
            "priority": "LOW",
            "title": "Finalize Scrutiny Determination",
            "description": "All automated checks and evidence verifications are complete. Authorized reviewer may conclude scrutiny.",
            "reference_id": None,
        })

    return {
        "application_id": app.id,
        "application_title": app.application_reference,
        "application_status": app.lifecycle_status,
        "category_name": cat.name if cat else "Unassigned",
        "institution_name": inst.institution_name if inst else "Unknown Institution",
        "institution_code": inst.institution_identifier if inst else "N/A",
        "created_at": app.created_at,
        "documents_summary": documents_summary,
        "validation_summary": validation_summary,
        "anomaly_summary": anomaly_summary,
        "rule_explanations": rule_explanations,
        "anomalies": anomalies_list,
        "evidence_items": evidence_items,
        "recommended_actions": recommendations,
        "disclaimer": (
            "VerityAI Decision Support Layer: Automated validation results and AI-assisted findings "
            "are advisory only. Final regulatory determinations must be made by authorized human reviewers."
        ),
    }


def get_application_evidence_trace(db: Session, application_id: str) -> List[Dict[str, Any]]:
    """
    Extracts all evidence items traceable to documents, pages, and fields for an application.
    """
    summary = get_application_review_summary(db, application_id)
    if not summary:
        return []
    return summary["evidence_items"]


def generate_scrutiny_pdf(db: Session, application_id: str, actor_id: Optional[str] = None) -> ScrutinyReport:
    """
    Generates a multi-page PDF Scrutiny Dossier using PyMuPDF and stores it safely.
    Persists a ScrutinyReport database record with metadata and summary snapshot.
    """
    summary = get_application_review_summary(db, application_id)
    if not summary:
        raise ValueError(f"Application {application_id} not found")

    reports_dir = os.path.join(settings.STORAGE_LOCAL_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)

    report_id = str(uuid.uuid4())
    filename = f"scrutiny_dossier_{application_id[:8]}_{report_id[:8]}.pdf"
    file_path = os.path.join(reports_dir, filename)

    # Build PDF with PyMuPDF
    doc = fitz.open()

    def create_page():
        p = doc.new_page(width=595, height=842)  # A4 standard
        # Draw header banner
        p.draw_rect(fitz.Rect(0, 0, 595, 45), fill=(0.09, 0.11, 0.27))  # #171B45 Navy
        p.insert_text(fitz.Point(30, 28), "VERITYAI", fontsize=15, color=(1, 1, 1), fontname="helv")
        p.insert_text(fitz.Point(120, 28), "| Regulatory Scrutiny & Evidence Dossier", fontsize=11, color=(0.8, 0.7, 0.9), fontname="helv")
        
        # Draw footer
        p.draw_line(fitz.Point(30, 810), fitz.Point(565, 810), color=(0.8, 0.8, 0.8), width=0.5)
        p.insert_text(
            fitz.Point(30, 825),
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | VerityAI Prototype (SIH 2026)",
            fontsize=8,
            color=(0.5, 0.5, 0.5),
            fontname="helv",
        )
        return p

    current_page = create_page()
    y = 65

    def check_space(needed_height: float):
        nonlocal current_page, y
        if y + needed_height > 790:
            current_page = create_page()
            y = 65

    # 1. Title & Application Overview
    current_page.insert_text(fitz.Point(30, y), "INSTITUTIONAL APPLICATION SCRUTINY REPORT", fontsize=14, color=(0.09, 0.11, 0.27), fontname="helv")
    y += 20
    current_page.draw_rect(fitz.Rect(30, y, 565, y + 65), fill=(0.95, 0.93, 0.99), color=(0.8, 0.7, 0.91), width=0.8) # Pale lavender box
    
    app_meta_lines = [
        f"Application ID: {summary['application_id']}",
        f"Title: {summary['application_title']}",
        f"Institution: {summary['institution_name']} ({summary['institution_code']})",
        f"Category: {summary['category_name']} | Status: {summary['application_status']}",
    ]
    meta_y = y + 15
    for line in app_meta_lines:
        current_page.insert_text(fitz.Point(40, meta_y), line, fontsize=9.5, color=(0.1, 0.1, 0.2), fontname="helv")
        meta_y += 13
    y += 75

    # 2. Disclaimer Banner
    current_page.draw_rect(fitz.Rect(30, y, 565, y + 36), fill=(0.98, 0.98, 0.98), color=(0.88, 0.26, 0.22), width=1) # Red border
    current_page.insert_text(fitz.Point(40, y + 14), "ADVISORY NOTICE — HUMAN REVIEW REQUIRED", fontsize=9, color=(0.88, 0.26, 0.22), fontname="helv")
    current_page.insert_text(
        fitz.Point(40, y + 27),
        "This document is an AI-assisted decision-support report. It does not constitute official approval or confirmed fraud.",
        fontsize=8,
        color=(0.3, 0.3, 0.3),
        fontname="helv",
    )
    y += 48

    # 3. Scrutiny Metrics Summary Box
    check_space(55)
    current_page.insert_text(fitz.Point(30, y), "1. EXECUTIVE SCRUTINY SUMMARY", fontsize=11, color=(0.09, 0.11, 0.27), fontname="helv")
    y += 15

    doc_s = summary["documents_summary"]
    val_s = summary["validation_summary"]
    anom_s = summary["anomaly_summary"]

    col1 = f"Documents: {doc_s['processed_documents']}/{doc_s['total_documents']} processed | Missing Required: {len(doc_s['missing_required_types'])}"
    col2 = f"Rules Evaluated: {val_s['total_rules']} (Passed: {val_s['passed']}, Failed: {val_s['failed']}, Review: {val_s['needs_review']})"
    col3 = f"Anomalies: {anom_s['total_findings']} total ({anom_s['open_findings']} open, {anom_s['confirmed_findings']} confirmed)"

    current_page.draw_rect(fitz.Rect(30, y, 565, y + 40), fill=(1, 1, 1), color=(0.85, 0.85, 0.85), width=0.5)
    current_page.insert_text(fitz.Point(40, y + 14), col1, fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
    current_page.insert_text(fitz.Point(40, y + 25), col2, fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
    current_page.insert_text(fitz.Point(40, y + 35), col3, fontsize=8.5, color=(0.2, 0.2, 0.2), fontname="helv")
    y += 50

    # 4. Deterministic Validation Explanations
    check_space(40)
    current_page.insert_text(fitz.Point(30, y), "2. DETERMINISTIC VALIDATION FINDINGS & EXPLANATIONS", fontsize=11, color=(0.09, 0.11, 0.27), fontname="helv")
    y += 15

    rule_items = summary["rule_explanations"]
    if not rule_items:
        current_page.insert_text(fitz.Point(40, y + 12), "No validation rules have been evaluated for this application.", fontsize=9, color=(0.5, 0.5, 0.5), fontname="helv")
        y += 25
    else:
        for r in rule_items:
            check_space(45)
            # Box color by status
            st = r["status"]
            border_color = (0.2, 0.7, 0.3) if st == "PASSED" else ((0.88, 0.26, 0.22) if st == "FAILED" else (0.8, 0.5, 0.1))
            bg_color = (0.96, 0.99, 0.96) if st == "PASSED" else ((1, 0.96, 0.96) if st == "FAILED" else (1, 0.98, 0.93))
            
            current_page.draw_rect(fitz.Rect(30, y, 565, y + 38), fill=bg_color, color=border_color, width=0.6)
            current_page.insert_text(fitz.Point(40, y + 12), f"[{r['status']}] {r['rule_code']} — {r['name']}", fontsize=9, color=(0.1, 0.1, 0.2), fontname="helv")
            current_page.insert_text(fitz.Point(40, y + 23), f"Observed: {r['observed']} | Source: {r['evidence_source']}", fontsize=8, color=(0.3, 0.3, 0.3), fontname="helv")
            if r["recommendation"]:
                current_page.insert_text(fitz.Point(40, y + 33), f"Recommendation: {r['recommendation']}", fontsize=8, color=(0.45, 0.31, 0.85), fontname="helv")
            y += 44

    # 5. Anomaly Detection Findings & Evidence
    check_space(40)
    current_page.insert_text(fitz.Point(30, y), "3. ANOMALY DETECTION & CROSS-DOCUMENT CHECKS", fontsize=11, color=(0.09, 0.11, 0.27), fontname="helv")
    y += 15

    anom_items = summary["anomalies"]
    if not anom_items:
        current_page.insert_text(fitz.Point(40, y + 12), "No anomalies or cross-document discrepancies detected.", fontsize=9, color=(0.5, 0.5, 0.5), fontname="helv")
        y += 25
    else:
        for a in anom_items:
            check_space(50)
            current_page.draw_rect(fitz.Rect(30, y, 565, y + 44), fill=(0.98, 0.98, 1), color=(0.7, 0.7, 0.85), width=0.6)
            current_page.insert_text(fitz.Point(40, y + 13), f"[{a['severity']}] {a['finding_code']} — {a['title']} (Status: {a['status']})", fontsize=9, color=(0.1, 0.1, 0.2), fontname="helv")
            current_page.insert_text(fitz.Point(40, y + 25), f"Description: {a['description']}", fontsize=8, color=(0.3, 0.3, 0.3), fontname="helv")
            if a["evidence"]:
                first_ev = a["evidence"][0]
                doc_cite = f"Doc: {first_ev['document_name'] or 'N/A'}, Page: {first_ev['page_number'] or 'N/A'}"
                current_page.insert_text(fitz.Point(40, y + 36), f"Evidence Citation: {doc_cite} | Declared: '{first_ev['declared_value']}' vs Extracted: '{first_ev['extracted_value']}'", fontsize=8, color=(0.4, 0.2, 0.6), fontname="helv")
            y += 50

    # 6. Recommended Next Actions
    check_space(40)
    current_page.insert_text(fitz.Point(30, y), "4. RECOMMENDED REVIEWER ACTIONS", fontsize=11, color=(0.09, 0.11, 0.27), fontname="helv")
    y += 15

    rec_items = summary["recommended_actions"]
    if not rec_items:
        current_page.insert_text(fitz.Point(40, y + 12), "No pending actions required at this stage.", fontsize=9, color=(0.5, 0.5, 0.5), fontname="helv")
        y += 25
    else:
        for rec in rec_items:
            check_space(32)
            current_page.insert_text(fitz.Point(40, y + 12), f"• [{rec['priority']}] {rec['title']}", fontsize=9, color=(0.1, 0.1, 0.2), fontname="helv")
            current_page.insert_text(fitz.Point(48, y + 23), rec["description"], fontsize=8, color=(0.35, 0.35, 0.35), fontname="helv")
            y += 28

    # Save to disk
    doc.save(file_path)
    file_size = os.path.getsize(file_path)

    # Persist ScrutinyReport model
    report_record = ScrutinyReport(
        id=report_id,
        application_id=application_id,
        generated_by_id=actor_id,
        report_type="SCRUTINY_DOSSIER",
        format="PDF",
        storage_path=file_path,
        file_size_bytes=file_size,
        summary_snapshot={
            "application_id": summary["application_id"],
            "application_status": summary["application_status"],
            "documents_summary": summary["documents_summary"],
            "validation_summary": summary["validation_summary"],
            "anomaly_summary": summary["anomaly_summary"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    db.add(report_record)

    # Audit event
    audit_evt = AuditEvent(
        id=str(uuid.uuid4()),
        application_id=application_id,
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        event_type="REPORT_GENERATED",
        metadata_json={
            "report_id": report_id,
            "format": "PDF",
            "file_size_bytes": file_size,
        },
    )
    db.add(audit_evt)
    db.commit()
    db.refresh(report_record)

    return report_record


def generate_scrutiny_json(db: Session, application_id: str, actor_id: Optional[str] = None) -> ScrutinyReport:
    """
    Generates a structured JSON Scrutiny Dossier and persists a ScrutinyReport record.
    """
    summary = get_application_review_summary(db, application_id)
    if not summary:
        raise ValueError(f"Application {application_id} not found")

    reports_dir = os.path.join(settings.STORAGE_LOCAL_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)

    report_id = str(uuid.uuid4())
    filename = f"scrutiny_dossier_{application_id[:8]}_{report_id[:8]}.json"
    file_path = os.path.join(reports_dir, filename)

    # Convert datetimes for JSON serialization
    serialized_summary = json.loads(json.dumps(summary, default=str))

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(serialized_summary, f, indent=2)

    file_size = os.path.getsize(file_path)

    report_record = ScrutinyReport(
        id=report_id,
        application_id=application_id,
        generated_by_id=actor_id,
        report_type="SCRUTINY_DOSSIER",
        format="JSON",
        storage_path=file_path,
        file_size_bytes=file_size,
        summary_snapshot=serialized_summary,
    )
    db.add(report_record)

    audit_evt = AuditEvent(
        id=str(uuid.uuid4()),
        application_id=application_id,
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        event_type="REPORT_GENERATED",
        metadata_json={
            "report_id": report_id,
            "format": "JSON",
            "file_size_bytes": file_size,
        },
    )
    db.add(audit_evt)
    db.commit()
    db.refresh(report_record)

    return report_record
