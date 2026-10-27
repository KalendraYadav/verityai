from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.document import Document
from app.models.validation import ValidationRun, RuleResult
from app.models.finding import Finding
from app.models.category import ApplicationCategory
from app.models.institution import Institution
from app.schemas.workflow import (
    StageDetail,
    WorkflowStatusResponse,
    ApplicationReadinessResponse,
    DocumentReadiness,
    ProcessingReadiness,
    ValidationReadiness,
    AnomalyReadiness,
    ScrutinyQueueItem,
    ChecklistItemResponse,
    ApplicationChecklistResponse,
)
from app.services.document_catalog import (
    DOCUMENT_CATALOGUE,
    DOCUMENT_TYPE_ALIASES,
    resolve_document_type,
    get_catalog_entry,
)
from app.services.validation import run_application_validation
from app.services.anomaly import run_application_analysis
from app.services.audit import record_audit_event


VALID_LIFECYCLE_STATES = {
    "DRAFT",
    "SUBMITTED",
    "UNDER_SCRUTINY",
    "ACTION_REQUIRED",
    "SCRUTINY_COMPLETED",
}

PERMITTED_TRANSITIONS: Dict[str, List[str]] = {
    "DRAFT": ["SUBMITTED"],
    "SUBMITTED": ["UNDER_SCRUTINY", "DRAFT"],
    "UNDER_SCRUTINY": ["ACTION_REQUIRED", "SCRUTINY_COMPLETED"],
    "ACTION_REQUIRED": ["SUBMITTED", "UNDER_SCRUTINY"],
    "SCRUTINY_COMPLETED": ["UNDER_SCRUTINY"],  # Authorized reopening only
}


def evaluate_conditional_checklist(db: Session, application_id: str) -> ApplicationChecklistResponse:
    """Evaluate application-specific statutory document requirements dynamically.
    Evaluates mandatory items per application category and evaluates conditional rules:
    - Land title / lease status (Clause 6.17(a))
    - Building age > 30 years structural stability (Clause 6.17(h))
    - Intake expansion / new courses core branch resolution (Clause 2.6(c))
    - Foreign university collaboration agreement (Chapter III)
    - Online EVC video tour submission (Clause 1.9(f))
    - Autonomous / Extended 3-year EoA accreditation certificate (Clause 2.1(a))
    Returns structured checklist items with explicit statuses, activating conditions,
    and citations from APH 2024-27.
    """
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    category = db.get(ApplicationCategory, app.category_code)
    cat_code = app.category_code or "EOA_ILLUSTRATIVE"
    cat_name = category.name if category else cat_code
    decl = app.declared_data or {}

    # Fetch all active documents for this application
    docs = list(
        db.scalars(
            select(Document).where(
                Document.application_id == application_id,
                Document.deleted_at.is_(None),
            )
        ).all()
    )

    # Map uploaded documents by canonical code and raw alias
    uploaded_map: Dict[str, Document] = {}
    for d in docs:
        raw_type = d.effective_type or d.declared_type or d.detected_type
        if raw_type:
            uploaded_map[raw_type] = d
            resolved = resolve_document_type(raw_type)
            if resolved:
                uploaded_map[resolved] = d
                for alias_k, canonical_v in DOCUMENT_TYPE_ALIASES.items():
                    if canonical_v == resolved:
                        uploaded_map[alias_k] = d

    items: List[ChecklistItemResponse] = []
    seen_codes = set()

    # Helper function to evaluate and append a checklist item
    def add_item(
        doc_code: str,
        is_mandatory: bool,
        rationale: str,
        activating_condition: Optional[str] = None,
        clause: Optional[str] = None,
        page: Optional[int] = None,
        condition_active: bool = True,
        human_review_required: bool = False,
    ):
        if doc_code in seen_codes:
            return
        seen_codes.add(doc_code)

        cat_entry = get_catalog_entry(doc_code)
        title = cat_entry["name"] if cat_entry else doc_code.replace("_", " ").title()
        ref_clause = clause or (cat_entry["official_reference"] if cat_entry else "APH 2024-27")
        ref_page = page or (cat_entry["pdf_page"] if cat_entry else 1)

        canonical_code = resolve_document_type(doc_code)
        doc_match = uploaded_map.get(doc_code) or (uploaded_map.get(canonical_code) if canonical_code else None)
        is_present = doc_match is not None
        doc_id = doc_match.id if doc_match else None
        doc_name = doc_match.original_filename if doc_match else None

        if not condition_active:
            status_val = "NOT_APPLICABLE"
        elif is_present:
            if doc_match.processing_status in ("PENDING", "PROCESSING", "SUBMITTED"):
                status_val = "PENDING_VERIFICATION"
            else:
                status_val = "REQUIRED_UPLOADED"
        else:
            if is_mandatory:
                status_val = "REQUIRED_MISSING"
            elif human_review_required:
                status_val = "NEEDS_HUMAN_REVIEW"
            else:
                status_val = "CONDITIONAL_NEEDS_REVIEW"

        items.append(
            ChecklistItemResponse(
                document_code=doc_code,
                title=title,
                status=status_val,
                mandatory_or_conditional="MANDATORY" if is_mandatory else "CONDITIONAL",
                condition_rationale=rationale,
                activating_condition=activating_condition,
                source_clause=ref_clause,
                pdf_page=ref_page,
                is_present=is_present,
                uploaded_document_id=doc_id,
                uploaded_document_name=doc_name,
                human_review_required=human_review_required or (status_val in ("NEEDS_HUMAN_REVIEW", "CONDITIONAL_NEEDS_REVIEW")),
            )
        )

    # 1. Base mandatory documents declared in category schema/table
    cat_req_types = list(category.required_document_types) if (category and category.required_document_types) else []
    for rtype in cat_req_types:
        add_item(
            rtype,
            is_mandatory=True,
            rationale=f"Mandatory document for category '{cat_name}'.",
            activating_condition=f"Category requirement: {cat_name}",
        )

    # 2. Evaluate Statutory Category Documents & Conditionals
    upper_cat = cat_code.upper()
    if upper_cat == "NEW_INSTITUTION":
        # Mandatory Chapter I Documents
        add_item("DOC_DPR", True, "Detailed Project Report is mandatory for new institution establishment.", "Establishment of new institution", "Annexure 1.1 (xi)", 95)
        add_item("DOC_TRUST_REG", True, "Registered Society/Trust/Section 8 Company documentation.", "All private institutional promoters", "Clause 1.3.4 (a)", 18)
        add_item("DOC_BUILDING_PLAN", True, "Sanctioned building plan approved by Competent Authority.", "All construction proposals", "Clause 1.5.1 (c)", 20)
        add_item("DOC_OCCUPANCY_CERT", True, "Occupancy certificate from Competent Authority listed in Annexure-14.", "Prior to campus occupancy", "Clause 6.17 (g)", 73)
        add_item("DOC_FIRE_SAFETY", True, "Fire safety certificate from State Fire Services Department.", "Mandatory campus safety", "Clause 6.17 (i)", 73)
        add_item("DOC_BANK_CERT", True, "Certificate 3 from Bank Manager confirming minimum operational funds.", "Operational fund verification", "Clause 1.5.3 / Annexure 1.1", 21)
        add_item("DOC_AFFIDAVIT_2", True, "Affidavit 2 sworn before Judicial Magistrate or Public Notary on Rs.100/- stamp paper.", "Mandatory Chapter I deposition", "Clause 1.4.4", 20)
        add_item("DOC_CERTIFICATE_2", True, "Certificate 2 prepared by Council of Architecture registered Architect.", "Architectural floor area certification", "Annexure 1.1 (i)", 93)
        add_item("DOC_CERTIFICATE_3", True, "Certificate 3 from Bank Manager on official bank letterhead.", "Financial viability certification", "Annexure 1.1 (vi)", 93)
        add_item("DOC_FORMAT_1", True, "Format 1 declaration for establishment of technical institution.", "Statutory applicant undertaking", "Format 1", 120)

        # Land Title & Lease Conditionals
        is_leased = decl.get("land_ownership") == "LEASED" or bool(decl.get("is_leased_land")) or "lease_duration_years" in decl
        add_item(
            "DOC_LAND_DEED",
            True,
            "Registered Land Conveyance / Lease Deed (Minimum 30 years registered period with live lease).",
            "Mandatory land possession and clear title",
            "Clause 6.17 (a)",
            72,
        )
        add_item(
            "DOC_CERTIFICATE_1",
            True,
            "Certificate 1 by Advocate on Letterhead verifying registered land title and encumbrances.",
            "Promoter land title verification",
            "Annexure 1.1 (Private Lease)",
            94,
            human_review_required=True,
        )
        add_item(
            "DOC_LAND_CLU",
            is_leased,
            "Land Use Certificate / Conversion Order from District Collector or Competent Revenue Authority.",
            "Triggered when institutional land requires agricultural conversion or lease verification",
            "Annexure 1.1 (viii)",
            93,
            condition_active=True,
        )
        add_item(
            "DOC_ENCUMBRANCE",
            is_leased,
            "Encumbrance Certificate for minimum 30 years issued by Sub-Registrar.",
            "Triggered for leased institutional property to verify clear non-encumbered title",
            "Clause 6.17 (a)",
            72,
            condition_active=is_leased,
        )

        # Building Age Conditionals
        bld_age = decl.get("building_age_years", 0)
        is_aged = bld_age > 30 or bool(decl.get("has_aged_building"))
        add_item(
            "DOC_STRUCT_STAB",
            False,
            "Structural Stability Certificate from registered Structural Engineer for buildings older than 30 years.",
            f"Triggered when building age exceeds 30 years (Declared age: {bld_age} yrs)" if is_aged else "Applicable only if building age exceeds 30 years",
            "Clause 6.17 (h)",
            73,
            condition_active=is_aged,
        )

        # EVC Online Conditionals
        is_online_evc = bool(decl.get("online_evc"))
        add_item(
            "DOC_EVC_VIDEO",
            False,
            "30-Minute geo-tagged institutional tour video on YouTube.",
            "Mandatory when Expert Visit Committee is conducted online",
            "Clause 1.9 (f)",
            24,
            condition_active=is_online_evc,
        )

        # Foreign Collaboration
        is_foreign = bool(decl.get("foreign_collaboration"))
        add_item(
            "DOC_FOREIGN_MOU",
            False,
            "Bipartite MoU and approvals between Indian and Foreign Universities.",
            "Mandatory when offering courses under Twinning or Foreign Collaboration",
            "Chapter III",
            48,
            condition_active=is_foreign,
        )

    elif upper_cat in ("EOA_TECHNICAL", "STANDALONE_PGDM"):
        # Mandatory Annual Chapter II Documents
        add_item("DOC_AFFIDAVIT_2", True, "Affidavit 2 sworn on Rs.100/- stamp paper.", "Annual EoA compliance declaration", "Clause 1.4.4", 20)
        add_item("DOC_FIRE_SAFETY", True, "Fire safety certificate with active statutory validity.", "Annual fire NOC renewal", "Clause 6.17 (i)", 73)
        add_item("DOC_OCCUPANCY_CERT", True, "Occupancy certificate / Form D from Competent Authority.", "Campus building authorization", "Clause 6.17 (g)", 73)
        add_item("DOC_PAYROLL_ECS", True, "Annual bank salary paid statement confirming ECS disbursement to faculty.", "Faculty ECS salary compliance", "Clause 6.14 (a)", 71)
        add_item("DOC_MANDATORY_DISC", True, "18-Point Public Mandatory Disclosure hosted on institutional website.", "Annual website disclosure", "Annexure 18", 180)

        # Extended EoA (3-Year) / Accreditation Conditionals
        wants_extended = bool(decl.get("seeking_extended_eoa")) or bool(decl.get("autonomous_status"))
        add_item(
            "DOC_ACCRED_CERT",
            wants_extended,
            "NBA Accreditation / NAAC Certificate (>=3.01) / NIRF Ranking proof for 3-Year Extended EoA.",
            "Triggered when applying for 3-Year Extended EoA or autonomous institution privilege" if wants_extended else "Optional for standard 1-year EoA; mandatory for 3-year extension",
            "Clause 2.1 (a)",
            27,
            condition_active=True,
        )

        # Intake Expansion Conditionals
        wants_expansion = bool(decl.get("applying_intake_expansion")) or bool(decl.get("new_courses_proposed"))
        add_item(
            "DOC_FORMAT_3",
            wants_expansion,
            "Promoter Trust Resolution for expansion of intake or additional courses.",
            "Triggered when applicant requests increase in intake or new programmes" if wants_expansion else "Applicable when requesting expansion of intake",
            "Clause 2.6 (c)",
            32,
            condition_active=wants_expansion,
        )
        add_item(
            "DOC_CERTIFICATE_2",
            wants_expansion,
            "Architect Certificate 2 detailing infrastructure adequacy for expanded intake.",
            "Triggered when expanding approved intake capacity",
            "Annexure 3.2.1",
            103,
            condition_active=wants_expansion,
        )

        # Building Age Conditionals
        bld_age = decl.get("building_age_years", 0)
        is_aged = bld_age > 30 or bool(decl.get("has_aged_building"))
        add_item(
            "DOC_STRUCT_STAB",
            False,
            "Structural Stability Certificate for buildings >30 years from completion.",
            f"Triggered when building age exceeds 30 years (Declared: {bld_age} yrs)" if is_aged else "Applicable if buildings are older than 30 years",
            "Clause 6.17 (h)",
            73,
            condition_active=is_aged,
        )

    elif upper_cat == "UNIVERSITY_TECHNICAL":
        add_item("DOC_AFFIDAVIT_2", True, "Affidavit 2 undertaking covering ALL technical programmes offering.", "Prohibition on partial university technical course approvals", "Clause 4.4.4 (b)", 55)
        add_item("DOC_FIRE_SAFETY", True, "Fire safety certificate with active statutory validity.", "University campus safety", "Clause 6.17 (i)", 73)
        add_item("DOC_OCCUPANCY_CERT", True, "Occupancy certificate / Form D from Competent Authority.", "Campus building authorization", "Clause 6.17 (g)", 73)
        add_item("DOC_MANDATORY_DISC", True, "18-Point Public Mandatory Disclosure hosted on institutional website.", "Annual website disclosure", "Annexure 18", 180)

    elif not cat_req_types:
        # Default fallback only if category has no required_document_types defined
        add_item("ACCREDITATION_CERTIFICATE", True, "Accreditation Certificate (NBA / NAAC) for technical approval.", "Illustrative demo requirement", "Chapter II", 27)
        add_item("LAND_USE_CERTIFICATE", True, "Land Use Certificate or Land Ownership Affidavit.", "Illustrative demo requirement", "Clause 6.17", 72)

    total_req = sum(1 for it in items if it.mandatory_or_conditional == "MANDATORY" and it.status != "NOT_APPLICABLE")
    total_pres = sum(1 for it in items if it.is_present)
    total_cond = sum(1 for it in items if it.mandatory_or_conditional == "CONDITIONAL" and it.status != "NOT_APPLICABLE")
    total_na = sum(1 for it in items if it.status == "NOT_APPLICABLE")

    return ApplicationChecklistResponse(
        application_id=application_id,
        category_code=cat_code,
        category_name=cat_name,
        total_required=total_req,
        total_present=total_pres,
        total_conditional=total_cond,
        total_not_applicable=total_na,
        items=items,
    )


def get_application_readiness(db: Session, application_id: str) -> ApplicationReadinessResponse:
    """Calculate multi-dimensional application readiness across documents, extraction,
    deterministic validation, and anomaly findings from actual persisted database records.
    Never collapses dimensions into an unexplained artificial percentage.
    """
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    # 1. Dynamic Conditional Checklist & Document Readiness
    checklist = evaluate_conditional_checklist(db, application_id)
    docs = list(db.scalars(select(Document).where(Document.application_id == application_id, Document.deleted_at.is_(None))).all())

    missing_items = [
        it for it in checklist.items
        if it.mandatory_or_conditional == "MANDATORY" and not it.is_present and it.status != "NOT_APPLICABLE"
    ]
    missing_types = [it.document_code for it in missing_items]
    doc_complete = len(missing_types) == 0

    doc_readiness = DocumentReadiness(
        complete=doc_complete,
        uploaded_count=len(docs),
        required_count=checklist.total_required,
        missing_types=missing_types,
    )

    # 2. Processing Readiness
    processed_count = sum(1 for d in docs if d.processing_status in ("EXTRACTED", "OCR_SUCCESS", "FALLBACK_OCR_SUCCESS"))
    pending_count = sum(1 for d in docs if d.processing_status in ("PENDING", "PROCESSING", "SUBMITTED"))
    failed_count = sum(1 for d in docs if d.processing_status in ("FAILED", "CORRUPTED", "ERROR"))
    proc_complete = len(docs) > 0 and pending_count == 0 and failed_count == 0

    proc_readiness = ProcessingReadiness(
        complete=proc_complete,
        total_documents=len(docs),
        processed_count=processed_count,
        pending_count=pending_count,
        failed_count=failed_count,
    )

    # 3. Validation Readiness
    latest_run = db.scalar(
        select(ValidationRun)
        .where(ValidationRun.application_id == application_id)
        .order_by(desc(ValidationRun.started_at))
    )
    if latest_run:
        results = list(db.scalars(select(RuleResult).where(RuleResult.validation_run_id == latest_run.id)).all())
        passed_count = sum(1 for r in results if r.status == "PASS")
        failed_count = sum(1 for r in results if r.status == "FAIL")
        needs_review_count = sum(1 for r in results if r.status == "NEEDS_REVIEW")
        unable_count = sum(1 for r in results if r.status == "UNABLE_TO_EVALUATE")
        val_evaluated = True
    else:
        passed_count = 0
        failed_count = 0
        needs_review_count = 0
        unable_count = 0
        val_evaluated = False

    val_readiness = ValidationReadiness(
        evaluated=val_evaluated,
        passed_count=passed_count,
        failed_count=failed_count,
        needs_review_count=needs_review_count,
        unable_to_evaluate_count=unable_count,
    )

    # 4. Anomaly Readiness
    findings = list(
        db.scalars(select(Finding).where(Finding.application_id == application_id, Finding.is_current.is_(True))).all()
    )
    open_findings = sum(1 for f in findings if f.review_status == "OPEN")
    confirmed_findings = sum(1 for f in findings if f.review_status == "CONFIRMED")
    dismissed_findings = sum(1 for f in findings if f.review_status == "DISMISSED")
    resolved_findings = sum(1 for f in findings if f.review_status == "RESOLVED")

    anomaly_readiness = AnomalyReadiness(
        analyzed=len(findings) > 0 or latest_run is not None,
        total_findings=len(findings),
        open_findings=open_findings,
        confirmed_findings=confirmed_findings,
        dismissed_findings=dismissed_findings,
        resolved_findings=resolved_findings,
    )

    # 5. Compile Blockers and Final Readiness State
    blockers: List[str] = []
    if missing_types:
        blockers.append(f"Missing mandatory supporting documents: {', '.join(missing_types)}")
    if pending_count > 0:
        blockers.append(f"{pending_count} document(s) currently being processed for text extraction")
    if failed_count > 0:
        blockers.append(f"{failed_count} document(s) failed text extraction and require re-upload or inspection")
    if not val_evaluated:
        blockers.append("Deterministic regulatory validation has not yet been executed")
    if failed_count > 0:
        blockers.append(f"{failed_count} statutory validation rule failure(s) recorded")
    if open_findings > 0:
        blockers.append(f"{open_findings} discrepancy finding(s) require human reviewer examination")

    if app.lifecycle_status == "SCRUTINY_COMPLETED":
        readiness_state = "SCRUTINY_COMPLETED"
        is_ready = False
        action = "Scrutiny completed by regulatory reviewer. No further automated actions pending."
    elif app.lifecycle_status == "ACTION_REQUIRED":
        readiness_state = "ACTION_REQUIRED"
        is_ready = False
        action = "Awaiting supplementary institutional documents or clarifications from applicant."
    elif not doc_complete:
        readiness_state = "DOCUMENTS_PENDING"
        is_ready = False
        action = "Upload missing mandatory documents before proceeding to scrutiny."
    elif pending_count > 0:
        readiness_state = "EXTRACTION_IN_PROGRESS"
        is_ready = False
        action = "Allow background text extraction & OCR to finish."
    elif not val_evaluated:
        readiness_state = "VALIDATION_REQUIRED"
        is_ready = False
        action = "Execute deterministic validation engine to evaluate statutory rules."
    else:
        readiness_state = "READY_FOR_SCRUTINY"
        is_ready = True
        action = "Ready for human regulatory review and finding adjudication."

    return ApplicationReadinessResponse(
        application_id=app.id,
        is_ready_for_scrutiny=is_ready,
        readiness_state=readiness_state,
        document_readiness=doc_readiness,
        processing_readiness=proc_readiness,
        validation_readiness=val_readiness,
        anomaly_readiness=anomaly_readiness,
        blockers=blockers,
        recommended_action=action,
        checklist=checklist,
    )


def get_workflow_status(db: Session, application_id: str) -> WorkflowStatusResponse:
    """Retrieve structured workflow stage progression for an application."""
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    readiness = get_application_readiness(db, application_id)

    stages = {
        "documents": StageDetail(
            status="COMPLETE" if readiness.document_readiness.complete else "PENDING",
            summary=f"{readiness.document_readiness.uploaded_count}/{readiness.document_readiness.required_count} required documents present",
            metadata={"missing_types": readiness.document_readiness.missing_types},
        ),
        "extraction": StageDetail(
            status="COMPLETE" if readiness.processing_readiness.complete else (
                "IN_PROGRESS" if readiness.processing_readiness.pending_count > 0 else "PARTIAL"
            ),
            summary=f"{readiness.processing_readiness.processed_count} processed, {readiness.processing_readiness.failed_count} failed",
            metadata={
                "pending": readiness.processing_readiness.pending_count,
                "failed": readiness.processing_readiness.failed_count,
            },
        ),
        "validation": StageDetail(
            status="COMPLETE" if readiness.validation_readiness.evaluated else "NOT_STARTED",
            summary=f"{readiness.validation_readiness.passed_count} passed, {readiness.validation_readiness.failed_count} failed, {readiness.validation_readiness.needs_review_count} review required",
            metadata={
                "evaluated": readiness.validation_readiness.evaluated,
                "failures": readiness.validation_readiness.failed_count,
            },
        ),
        "anomalies": StageDetail(
            status="COMPLETE" if readiness.anomaly_readiness.analyzed else "NOT_STARTED",
            summary=f"{readiness.anomaly_readiness.total_findings} findings discovered ({readiness.anomaly_readiness.open_findings} open)",
            metadata={
                "open": readiness.anomaly_readiness.open_findings,
                "confirmed": readiness.anomaly_readiness.confirmed_findings,
            },
        ),
        "decision": StageDetail(
            status="COMPLETE" if app.lifecycle_status == "SCRUTINY_COMPLETED" else (
                "UNDER_REVIEW" if app.lifecycle_status == "UNDER_SCRUTINY" else "PENDING"
            ),
            summary=f"Lifecycle: {app.lifecycle_status}",
            metadata={"assigned_reviewer_id": app.assigned_reviewer_id},
        ),
    }

    return WorkflowStatusResponse(
        application_id=app.id,
        application_reference=app.application_reference,
        lifecycle_status=app.lifecycle_status,
        pipeline_status=app.pipeline_status,
        submitted_at=app.submitted_at,
        assigned_reviewer_id=app.assigned_reviewer_id,
        stages=stages,
        last_updated_at=app.updated_at,
    )


def transition_application_state(
    db: Session,
    application_id: str,
    target_status: str,
    actor_id: Optional[str] = None,
    reason: Optional[str] = None,
    reviewer_notes: Optional[str] = None,
) -> Application:
    """Validate and execute application lifecycle state transitions."""
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    target_status_upper = target_status.upper().strip()
    if target_status_upper not in VALID_LIFECYCLE_STATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_STATE",
                "message": f"'{target_status}' is not a valid lifecycle state. Allowed: {sorted(list(VALID_LIFECYCLE_STATES))}",
            },
        )

    current_status = app.lifecycle_status
    if target_status_upper == current_status:
        # Idempotent no-op
        return app

    allowed = PERMITTED_TRANSITIONS.get(current_status, [])
    if target_status_upper not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_STATE_TRANSITION",
                "message": f"Transition from '{current_status}' to '{target_status_upper}' is disallowed. Allowed: {allowed}",
            },
        )

    # Transition side-effects
    if target_status_upper == "SUBMITTED":
        app.submitted_at = datetime.now(timezone.utc)
    elif target_status_upper == "UNDER_SCRUTINY" and actor_id and not app.assigned_reviewer_id:
        app.assigned_reviewer_id = actor_id

    old_status = app.lifecycle_status
    app.lifecycle_status = target_status_upper
    app.updated_at = datetime.now(timezone.utc)

    record_audit_event(
        db=db,
        event_type="APPLICATION_STATUS_TRANSITION",
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        application_id=app.id,
        entity_type="application",
        entity_id=app.id,
        metadata={
            "old_status": old_status,
            "new_status": target_status_upper,
            "reason": reason,
            "reviewer_notes": reviewer_notes,
        },
    )
    db.commit()
    db.refresh(app)
    return app


def start_or_resume_workflow(
    db: Session,
    application_id: str,
    actor_id: Optional[str] = None,
) -> WorkflowStatusResponse:
    """Orchestrate the end-to-end scrutiny pipeline for an application:
    1. Assess document uploads and text extraction.
    2. Execute deterministic validation engine.
    3. Execute AI-assisted cross-document anomaly analysis.
    4. Transition pipeline_status and return comprehensive workflow status.
    """
    app = db.get(Application, application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPLICATION_NOT_FOUND", "message": f"Application '{application_id}' not found."},
        )

    record_audit_event(
        db=db,
        event_type="WORKFLOW_INITIATED",
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        application_id=app.id,
        metadata={"current_lifecycle": app.lifecycle_status},
    )

    app.pipeline_status = "PROCESSING"
    db.commit()

    # Step 1: Run deterministic validation
    val_summary = run_application_validation(application_id=application_id, db=db, triggered_by=actor_id)

    # Step 2: Run AI-assisted anomaly detection
    analysis_res = run_application_analysis(db=db, application_id=application_id, actor_id=actor_id)

    # Step 3: Determine resulting pipeline status
    val_failed = val_summary.get("failed", 0)
    val_needs_review = val_summary.get("needs_review", 0)
    analysis_open = analysis_res.get("open_findings", 0)

    if val_failed > 0:
        app.pipeline_status = "VALIDATION_FAILED"
    elif val_needs_review > 0 or analysis_open > 0:
        app.pipeline_status = "NEEDS_REVIEW"
    else:
        app.pipeline_status = "COMPLETED"

    # If application is DRAFT but now validated and ready, advance to SUBMITTED
    if app.lifecycle_status == "DRAFT":
        readiness = get_application_readiness(db, application_id)
        if readiness.document_readiness.complete:
            app.lifecycle_status = "SUBMITTED"
            app.submitted_at = datetime.now(timezone.utc)

    app.updated_at = datetime.now(timezone.utc)
    record_audit_event(
        db=db,
        event_type="WORKFLOW_COMPLETED",
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        application_id=app.id,
        metadata={
            "pipeline_status": app.pipeline_status,
            "validation_passed": val_summary.get("passed", 0),
            "validation_failed": val_failed,
            "anomalies_detected": analysis_res.get("total_anomalies", 0),
        },
    )
    db.commit()
    db.refresh(app)

    return get_workflow_status(db, application_id)


def list_scrutiny_queue(
    db: Session,
    readiness_state: Optional[str] = None,
    lifecycle_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[ScrutinyQueueItem], int]:
    """Retrieve prioritized list of applications currently in or awaiting scrutiny."""
    stmt = (
        select(Application, Institution.institution_name, Institution.institution_identifier)
        .join(Institution, Application.institution_id == Institution.id)
        .order_by(desc(Application.updated_at))
    )

    if lifecycle_status:
        stmt = stmt.where(Application.lifecycle_status == lifecycle_status.upper())
    else:
        # Default scrutiny queue: submitted or under active scrutiny
        stmt = stmt.where(Application.lifecycle_status.in_(["SUBMITTED", "UNDER_SCRUTINY", "ACTION_REQUIRED"]))

    rows = db.execute(stmt).all()

    queue_items: List[ScrutinyQueueItem] = []
    for app_obj, inst_name, inst_code in rows:
        readiness = get_application_readiness(db, app_obj.id)
        if readiness_state and readiness.readiness_state != readiness_state.upper():
            continue

        item = ScrutinyQueueItem(
            id=app_obj.id,
            application_reference=app_obj.application_reference,
            institution_id=app_obj.institution_id,
            institution_name=inst_name,
            institution_identifier=inst_code,
            category_code=app_obj.category_code,
            academic_year=app_obj.academic_year,
            lifecycle_status=app_obj.lifecycle_status,
            pipeline_status=app_obj.pipeline_status,
            readiness_state=readiness.readiness_state,
            blockers_count=len(readiness.blockers),
            open_findings_count=readiness.anomaly_readiness.open_findings,
            validation_failure_count=readiness.validation_readiness.failed_count,
            assigned_reviewer_id=app_obj.assigned_reviewer_id,
            submitted_at=app_obj.submitted_at,
            created_at=app_obj.created_at,
        )
        queue_items.append(item)

    total = len(queue_items)
    paged_items = queue_items[offset : offset + limit]
    return paged_items, total
