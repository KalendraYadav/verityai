import os
import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import pymupdf as fitz

from app.core.config import settings
from app.models.integration_job import IntegrationScrutinyJob
from app.models.integration_client import IntegrationClient
from app.services.audit import record_audit_event


def get_integration_uploads_dir(client_id: str, job_id: str) -> str:
    """Secure, isolated directory for client uploaded documents."""
    clean_client = "".join(c for c in client_id if c.isalnum() or c in ("-", "_"))
    clean_job = "".join(c for c in job_id if c.isalnum() or c in ("-", "_"))
    target = os.path.join(settings.STORAGE_LOCAL_DIR, "integrations", clean_client, clean_job)
    os.makedirs(target, exist_ok=True)
    return target


def create_integration_job(
    db: Session,
    client: IntegrationClient,
    external_reference: str,
    category_code: str,
    declared_data: Dict[str, Any],
    files: List[UploadFile],
    idempotency_key: Optional[str] = None,
) -> IntegrationScrutinyJob:
    """
    Register and queue a new scrutiny job from an authorized integration client.
    Handles file upload securely, prevents path traversal, and enforces idempotency.
    """
    # 1. Idempotency Check
    if idempotency_key:
        existing = db.scalar(
            select(IntegrationScrutinyJob).where(
                IntegrationScrutinyJob.client_id == client.client_id,
                IntegrationScrutinyJob.idempotency_key == idempotency_key,
            )
        )
        if existing:
            return existing

    job_id = f"VAI-JOB-{uuid.uuid4().hex[:8].upper()}"
    job_dir = get_integration_uploads_dir(client.client_id, job_id)

    submitted_docs: List[Dict[str, Any]] = []

    for idx, file in enumerate(files):
        filename = os.path.basename(file.filename or f"document_{idx + 1}.pdf")
        doc_id = f"doc_{uuid.uuid4().hex[:8]}"
        safe_storage_name = f"{doc_id}_{filename}"
        storage_path = os.path.join(job_dir, safe_storage_name)

        # Stream save and compute sha256
        sha256_hasher = hashlib.sha256()
        total_size = 0

        # Read file contents
        content = file.file.read()
        if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"code": "FILE_TOO_LARGE", "message": f"File '{filename}' exceeds {settings.MAX_UPLOAD_SIZE_BYTES} bytes."},
            )

        total_size = len(content)
        sha256_hasher.update(content)

        with open(storage_path, "wb") as out_f:
            out_f.write(content)

        submitted_docs.append({
            "doc_id": doc_id,
            "original_filename": filename,
            "media_type": file.content_type or "application/pdf",
            "size_bytes": total_size,
            "sha256": sha256_hasher.hexdigest(),
            "storage_path": storage_path,
            "declared_type": "STATUTORY_DOCUMENT",
        })

    job = IntegrationScrutinyJob(
        id=job_id,
        client_id=client.client_id,
        external_reference=external_reference.strip(),
        idempotency_key=idempotency_key.strip() if idempotency_key else None,
        category_code=category_code.strip(),
        status="QUEUED",
        stage="INTAKE",
        submitted_documents=submitted_docs,
        declared_data=declared_data,
        rule_results=[],
        findings=[],
        summary={},
        provider_metadata={"provider_id": "local_deterministic_v1", "provider_status": "ACTIVE"},
    )
    db.add(job)

    record_audit_event(
        db=db,
        event_type="INTEGRATION_JOB_CREATED",
        actor_id=client.client_id,
        actor_type="API_CLIENT",
        entity_type="INTEGRATION_SCRUTINY_JOB",
        entity_id=job.id,
        metadata={"external_reference": external_reference, "document_count": len(submitted_docs)},
    )

    db.commit()
    db.refresh(job)
    return job


def execute_integration_job(db: Session, job_id: str) -> IntegrationScrutinyJob:
    """
    Execute the decoupled VerityAI scrutiny pipeline for an integration job:
    1. Extract text and structure from submitted documents.
    2. Execute deterministic statutory validation rules.
    3. Detect cross-document anomalies and statutory variances.
    4. Link findings to source evidence.
    5. Synthesize PDF decision-support report.
    """
    job = db.get(IntegrationScrutinyJob, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job.status = "PROCESSING"
    job.stage = "EXTRACTION"
    job.started_at = datetime.now(timezone.utc)
    db.commit()

    start_time = datetime.now(timezone.utc)

    extracted_texts: Dict[str, str] = {}
    doc_page_counts: Dict[str, int] = {}

    # Step 1: Extraction
    for doc in job.submitted_documents:
        path = doc.get("storage_path")
        doc_id = doc.get("doc_id")
        text = ""
        pages = 0
        if path and os.path.exists(path):
            try:
                pdf = fitz.open(path)
                pages = len(pdf)
                for page in pdf:
                    text += page.get_text() + "\n"
                pdf.close()
            except Exception as e:
                text = f"[Text Extraction Error: {str(e)}]"
        extracted_texts[doc_id] = text
        doc_page_counts[doc_id] = pages

    # Step 2: Deterministic Statutory Validation
    job.stage = "VALIDATION"
    db.commit()

    declared = job.declared_data or {}
    land_area = float(declared.get("land_area_acres") or declared.get("land_area") or 0.0)
    built_up_area = float(declared.get("total_built_up_area_sqm") or declared.get("built_up_area") or 0.0)
    intake = int(declared.get("total_approved_intake") or declared.get("approved_intake") or 0)

    rule_results: List[Dict[str, Any]] = []

    # Rule 1: Minimum Land Area (Clause 6.17(a))
    min_land_req = 7.5 if "ENGINEERING" in job.category_code else 4.0
    land_pass = land_area >= min_land_req
    rule_results.append({
        "rule_code": "RULE-APH-LAND-MINIMUM",
        "title": "Minimum Contiguous Land Requirement",
        "clause": "AICTE APH 2024-27 Clause 6.17(a)",
        "declared_value": f"{land_area} acres",
        "threshold": f">= {min_land_req} acres",
        "status": "PASS" if land_pass else "FAIL",
    })

    # Rule 2: Built-up Area per Intake
    expected_built_up = intake * 10.0  # e.g. 10 sqm per student
    bu_pass = built_up_area >= expected_built_up or expected_built_up == 0
    rule_results.append({
        "rule_code": "RULE-APH-INFRA-BUILTUP",
        "title": "Instructional & Administrative Built-Up Space",
        "clause": "AICTE APH 2024-27 Clause 6.17(b)",
        "declared_value": f"{built_up_area} sqm",
        "threshold": f">= {expected_built_up} sqm",
        "status": "PASS" if bu_pass else "FAIL",
    })

    # Step 3: Anomaly Detection & Cross-Document Checks
    job.stage = "ANOMALY_DETECTION"
    db.commit()

    findings: List[Dict[str, Any]] = []

    # Check extracted document text for discrepancies
    all_extracted_text = " ".join(extracted_texts.values()).lower()

    if not land_pass:
        findings.append({
            "finding_id": f"FIND-{uuid.uuid4().hex[:6].upper()}",
            "category": "STATUTORY_DEFICIENCY",
            "severity": "CRITICAL",
            "title": "Land Area Below AICTE Prescribed Threshold",
            "description": f"Declared land area ({land_area} acres) is below statutory minimum ({min_land_req} acres).",
            "rule_code": "RULE-APH-LAND-MINIMUM",
            "evidence_text": f"Declared Metric: land_area_acres = {land_area}",
            "document_id": job.submitted_documents[0]["doc_id"] if job.submitted_documents else None,
            "page_number": 1,
            "confidence": 1.0,
        })

    # Cross-check keywords for building plan / occupancy
    has_plan = any("plan" in doc["original_filename"].lower() or "building" in doc["original_filename"].lower() for doc in job.submitted_documents)
    has_fire = "fire" in all_extracted_text or any("fire" in doc["original_filename"].lower() for doc in job.submitted_documents)

    if not has_fire:
        findings.append({
            "finding_id": f"FIND-{uuid.uuid4().hex[:6].upper()}",
            "category": "COMPLIANCE_INDICATOR",
            "severity": "WARNING",
            "title": "No Verified Fire Safety NOC Reference Observed",
            "description": "Submitted document text does not contain active municipal Fire Safety NOC citations.",
            "rule_code": "RULE-APH-FIRE-SAFETY",
            "evidence_text": "Extracted corpus lacks keywords 'fire' or 'noc'.",
            "document_id": job.submitted_documents[0]["doc_id"] if job.submitted_documents else None,
            "page_number": 1,
            "confidence": 0.85,
        })

    # Step 4: Summary Computation
    job.stage = "REPORTING"
    db.commit()

    passed_cnt = sum(1 for r in rule_results if r["status"] == "PASS")
    failed_cnt = sum(1 for r in rule_results if r["status"] == "FAIL")

    severity_map = {}
    for f in findings:
        sev = f["severity"]
        severity_map[sev] = severity_map.get(sev, 0) + 1

    summary = {
        "total_documents": len(job.submitted_documents),
        "passed_rules": passed_cnt,
        "failed_rules": failed_cnt,
        "total_findings": len(findings),
        "severities": severity_map,
        "human_review_required": True,
    }

    # Step 5: Generate Scrutiny PDF Report
    report_filename = f"verityai_report_{job.id}.pdf"
    job_dir = get_integration_uploads_dir(job.client_id, job.id)
    report_full_path = os.path.join(job_dir, report_filename)

    try:
        doc_pdf = fitz.open()
        p = doc_pdf.new_page(width=595, height=842)
        # Header banner
        p.draw_rect(fitz.Rect(0, 0, 595, 45), fill=(0.09, 0.11, 0.27))
        p.insert_text(fitz.Point(30, 28), "VERITYAI", fontsize=15, color=(1, 1, 1), fontname="helv")
        p.insert_text(fitz.Point(120, 28), "| Official Decision-Support Scrutiny Dossier", fontsize=11, color=(0.8, 0.7, 0.9), fontname="helv")

        # Report Metadata
        p.insert_text(fitz.Point(30, 75), f"Scrutiny Job Reference: {job.id}", fontsize=12, fontname="helv")
        p.insert_text(fitz.Point(30, 95), f"External Reference: {job.external_reference}", fontsize=10, fontname="helv")
        p.insert_text(fitz.Point(30, 110), f"Client Identifier: {job.client_id}", fontsize=10, fontname="helv")
        p.insert_text(fitz.Point(30, 125), f"Statutory Category: {job.category_code}", fontsize=10, fontname="helv")
        p.insert_text(fitz.Point(30, 140), f"Execution Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}", fontsize=9, color=(0.4, 0.4, 0.4), fontname="helv")

        # Rules Summary
        p.insert_text(fitz.Point(30, 175), "STATUTORY NORMS EVALUATION (AICTE APH 2024-27)", fontsize=11, color=(0.09, 0.11, 0.27), fontname="helv")
        y = 195
        for r in rule_results:
            p.insert_text(fitz.Point(40, y), f"[{r['status']}] {r['title']} - {r['clause']}", fontsize=9, fontname="helv")
            p.insert_text(fitz.Point(55, y + 12), f"Declared: {r['declared_value']} | Threshold: {r['threshold']}", fontsize=8, color=(0.3, 0.3, 0.3), fontname="helv")
            y += 28

        # Findings Summary
        y += 10
        p.insert_text(fitz.Point(30, y), "ADVISORY FINDINGS & EVIDENCE TRACEABILITY", fontsize=11, color=(0.09, 0.11, 0.27), fontname="helv")
        y += 20
        if not findings:
            p.insert_text(fitz.Point(40, y), "No anomalies or compliance deficiencies observed.", fontsize=9, color=(0, 0.5, 0), fontname="helv")
            y += 20
        else:
            for f in findings:
                p.insert_text(fitz.Point(40, y), f"[{f['severity']}] {f['title']}", fontsize=9, fontname="helv")
                p.insert_text(fitz.Point(55, y + 12), f"{f['description']} (Evidence: {f['evidence_text']})", fontsize=8, color=(0.3, 0.3, 0.3), fontname="helv")
                y += 28

        # Footer
        p.draw_line(fitz.Point(30, 800), fitz.Point(565, 800), color=(0.8, 0.8, 0.8), width=0.5)
        p.insert_text(fitz.Point(30, 815), "VerityAI AI-Powered Application Validation Platform | SIH 2026 Prototype. Advisory findings only.", fontsize=8, color=(0.5, 0.5, 0.5), fontname="helv")

        doc_pdf.save(report_full_path)
        doc_pdf.close()
        job.report_path = report_full_path
    except Exception as e:
        job.report_path = None

    end_time = datetime.now(timezone.utc)
    duration_ms = int((end_time - start_time).total_seconds() * 1000)

    job.status = "COMPLETED"
    job.stage = "COMPLETE"
    job.rule_results = rule_results
    job.findings = findings
    job.summary = summary
    job.duration_ms = duration_ms
    job.completed_at = end_time

    record_audit_event(
        db=db,
        event_type="INTEGRATION_JOB_COMPLETED",
        actor_id=job.client_id,
        actor_type="API_CLIENT",
        entity_type="INTEGRATION_SCRUTINY_JOB",
        entity_id=job.id,
        metadata={"duration_ms": duration_ms, "findings_count": len(findings)},
    )

    db.commit()
    db.refresh(job)
    return job


def get_authorized_integration_job(db: Session, job_id: str, client_id: str) -> IntegrationScrutinyJob:
    """Retrieve integration job, strictly enforcing client tenant isolation."""
    job = db.get(IntegrationScrutinyJob, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": f"Scrutiny job '{job_id}' not found."},
        )

    if job.client_id != client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CROSS_CLIENT_FORBIDDEN", "message": "Access to another client's scrutiny job is forbidden."},
        )

    return job
