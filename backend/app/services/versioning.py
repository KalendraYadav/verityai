from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.application import Application
from app.models.document import Document
from app.models.versioning import ApplicationVersion, DocumentRevision
from app.models.validation import ValidationRun
from app.models.report import ScrutinyReport
from app.models.audit import AuditEvent
from app.core.exceptions import NotFoundException, ValidationException, ConflictException
from app.services.audit import record_audit_event


def create_initial_application_version_if_needed(
    db: Session,
    application: Application,
    actor_id: Optional[str] = None
) -> ApplicationVersion:
    """Ensure baseline version 1 exists for an application."""
    v1 = (
        db.query(ApplicationVersion)
        .filter(
            ApplicationVersion.application_id == application.id,
            ApplicationVersion.version_number == 1
        )
        .first()
    )
    if v1:
        return v1

    snapshot = {
        "application_reference": application.application_reference,
        "institution_id": application.institution_id,
        "category_code": application.category_code,
        "academic_year": application.academic_year,
        "lifecycle_status": application.lifecycle_status,
        "pipeline_status": application.pipeline_status,
        "declared_data": dict(application.declared_data or {}),
        "document_count": len(application.documents) if hasattr(application, "documents") else 0
    }

    v1 = ApplicationVersion(
        application_id=application.id,
        version_number=1,
        change_summary="Initial Application Baseline",
        changed_fields=None,
        snapshot_data=snapshot,
        created_by_id=actor_id or application.created_by,
    )
    db.add(v1)
    db.commit()
    db.refresh(v1)
    return v1


def record_application_version(
    db: Session,
    application_id: str,
    change_summary: str,
    actor_id: Optional[str] = None,
    explicit_changes: Optional[Dict[str, Any]] = None
) -> ApplicationVersion:
    """
    Creates a new version record for an application with field-level diffs and snapshot.
    Prevents duplicate versions if application data has not changed.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    # Ensure baseline v1 exists
    create_initial_application_version_if_needed(db, app, actor_id)

    # Fetch latest existing version
    latest = (
        db.query(ApplicationVersion)
        .filter(ApplicationVersion.application_id == application_id)
        .order_by(ApplicationVersion.version_number.desc())
        .first()
    )

    current_snapshot = {
        "application_reference": app.application_reference,
        "institution_id": app.institution_id,
        "category_code": app.category_code,
        "academic_year": app.academic_year,
        "lifecycle_status": app.lifecycle_status,
        "pipeline_status": app.pipeline_status,
        "declared_data": dict(app.declared_data or {}),
        "document_count": len(app.documents) if hasattr(app, "documents") else 0
    }

    # Compute differences from latest snapshot
    diffs = {}
    if latest and latest.snapshot_data:
        old_snap = latest.snapshot_data
        for k, v in current_snapshot.items():
            if old_snap.get(k) != v:
                diffs[k] = {"old": old_snap.get(k), "new": v}

    if explicit_changes:
        diffs.update(explicit_changes)

    # If no changes detected and version > 1, do not create duplicate
    if latest and latest.version_number >= 1 and not diffs and not explicit_changes:
        return latest

    next_version_num = (latest.version_number + 1) if latest else 1

    new_version = ApplicationVersion(
        application_id=app.id,
        version_number=next_version_num,
        change_summary=change_summary,
        changed_fields=diffs if diffs else None,
        snapshot_data=current_snapshot,
        created_by_id=actor_id,
    )
    db.add(new_version)

    # Record audit event
    record_audit_event(
        db=db,
        event_type="APPLICATION_VERSION_CREATED",
        entity_type="APPLICATION",
        entity_id=app.id,
        actor_id=actor_id,
        metadata={
            "version_number": next_version_num,
            "change_summary": change_summary,
            "changed_fields_count": len(diffs)
        }
    )

    db.commit()
    db.refresh(new_version)
    return new_version


def get_application_versions(db: Session, application_id: str) -> List[ApplicationVersion]:
    """Retrieve full chronological version history for an application."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    create_initial_application_version_if_needed(db, app)

    return (
        db.query(ApplicationVersion)
        .filter(ApplicationVersion.application_id == application_id)
        .order_by(ApplicationVersion.version_number.desc())
        .all()
    )


def get_application_version(db: Session, application_id: str, version_number: int) -> ApplicationVersion:
    """Retrieve details of a specific application version."""
    v = (
        db.query(ApplicationVersion)
        .filter(
            ApplicationVersion.application_id == application_id,
            ApplicationVersion.version_number == version_number
        )
        .first()
    )
    if not v:
        raise NotFoundException(
            code="VERSION_NOT_FOUND",
            message=f"Version {version_number} not found for application '{application_id}'."
        )
    return v


def compare_application_versions(
    db: Session,
    application_id: str,
    v1_num: int,
    v2_num: int
) -> Dict[str, Any]:
    """
    Computes human-readable field-by-field differences between two application versions.
    """
    v1 = get_application_version(db, application_id, v1_num)
    v2 = get_application_version(db, application_id, v2_num)

    s1 = v1.snapshot_data or {}
    s2 = v2.snapshot_data or {}

    all_keys = sorted(set(list(s1.keys()) + list(s2.keys())))
    differences = []

    for k in all_keys:
        val1 = s1.get(k)
        val2 = s2.get(k)
        is_changed = val1 != val2
        differences.append({
            "field": k,
            "v1_value": val1,
            "v2_value": val2,
            "is_changed": is_changed
        })

    return {
        "application_id": application_id,
        "v1_version": v1.version_number,
        "v1_created_at": v1.created_at.isoformat(),
        "v2_version": v2.version_number,
        "v2_created_at": v2.created_at.isoformat(),
        "total_fields": len(all_keys),
        "changed_fields_count": sum(1 for d in differences if d["is_changed"]),
        "differences": differences
    }


def create_initial_document_revision_if_needed(
    db: Session,
    doc: Document,
    actor_id: Optional[str] = None
) -> DocumentRevision:
    """Ensure baseline revision 1 exists for a document."""
    r1 = (
        db.query(DocumentRevision)
        .filter(
            DocumentRevision.document_id == doc.id,
            DocumentRevision.revision_number == 1
        )
        .first()
    )
    if r1:
        return r1

    r1 = DocumentRevision(
        document_id=doc.id,
        revision_number=1,
        storage_key=doc.storage_key,
        original_filename=doc.original_filename,
        file_size_bytes=doc.file_size_bytes,
        sha256=doc.sha256,
        change_reason="Initial Document Upload",
        uploaded_by_id=actor_id or doc.uploaded_by,
    )
    db.add(r1)
    db.commit()
    db.refresh(r1)
    return r1


def record_document_revision(
    db: Session,
    document_id: str,
    original_filename: str,
    storage_key: str,
    file_size_bytes: int,
    sha256: str,
    change_reason: Optional[str] = None,
    actor_id: Optional[str] = None
) -> DocumentRevision:
    """
    Creates a new revision for a document while preserving original files.
    Rejects duplicate content uploads with identical SHA-256.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise NotFoundException(code="DOCUMENT_NOT_FOUND", message=f"Document '{document_id}' not found.")

    # Ensure baseline r1 exists
    create_initial_document_revision_if_needed(db, doc, actor_id)

    # Check identical hash
    if doc.sha256 == sha256:
        raise ConflictException(
            code="DUPLICATE_REVISION_CONTENT",
            message="Uploaded file content is identical to the current document revision."
        )

    latest = (
        db.query(DocumentRevision)
        .filter(DocumentRevision.document_id == document_id)
        .order_by(DocumentRevision.revision_number.desc())
        .first()
    )
    next_rev = (latest.revision_number + 1) if latest else 1

    new_rev = DocumentRevision(
        document_id=doc.id,
        revision_number=next_rev,
        storage_key=storage_key,
        original_filename=original_filename,
        file_size_bytes=file_size_bytes,
        sha256=sha256,
        change_reason=change_reason or f"Revision {next_rev}",
        uploaded_by_id=actor_id,
    )
    db.add(new_rev)

    # Update document record to point to latest revision
    doc.storage_key = storage_key
    doc.original_filename = original_filename
    doc.file_size_bytes = file_size_bytes
    doc.sha256 = sha256
    doc.processing_status = "QUEUED"  # Requires re-extraction

    # Record application revision as well
    record_application_version(
        db=db,
        application_id=doc.application_id,
        change_summary=f"Document '{original_filename}' updated to Revision {next_rev}",
        actor_id=actor_id,
        explicit_changes={"document_revision": {"document_id": doc.id, "revision": next_rev}}
    )

    record_audit_event(
        db=db,
        event_type="DOCUMENT_REVISION_CREATED",
        entity_type="DOCUMENT",
        entity_id=doc.id,
        actor_id=actor_id,
        metadata={
            "revision_number": next_rev,
            "filename": original_filename,
            "sha256": sha256,
            "change_reason": change_reason
        }
    )

    db.commit()
    db.refresh(new_rev)
    return new_rev


def get_document_revisions(db: Session, document_id: str) -> List[DocumentRevision]:
    """Retrieve full chronological revision history for a document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise NotFoundException(code="DOCUMENT_NOT_FOUND", message=f"Document '{document_id}' not found.")

    create_initial_document_revision_if_needed(db, doc)

    return (
        db.query(DocumentRevision)
        .filter(DocumentRevision.document_id == document_id)
        .order_by(DocumentRevision.revision_number.desc())
        .all()
    )


def get_application_freshness_status(db: Session, application_id: str) -> Dict[str, Any]:
    """
    Evaluates whether the current application state and documents are fresh
    or whether prior validation runs and scrutiny reports are stale.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    latest_ver = (
        db.query(ApplicationVersion)
        .filter(ApplicationVersion.application_id == application_id)
        .order_by(ApplicationVersion.version_number.desc())
        .first()
    )
    current_ver_num = latest_ver.version_number if latest_ver else 1

    latest_val = (
        db.query(ValidationRun)
        .filter(ValidationRun.application_id == application_id)
        .order_by(ValidationRun.started_at.desc())
        .first()
    )

    latest_rep = (
        db.query(ScrutinyReport)
        .filter(ScrutinyReport.application_id == application_id)
        .order_by(ScrutinyReport.created_at.desc())
        .first()
    )

    # Determine if validation is stale
    validation_stale = False
    if not latest_val:
        validation_status = "NOT_EVALUATED"
    elif latest_ver and latest_val.started_at < latest_ver.created_at:
        validation_stale = True
        validation_status = "STALE_REEVALUATION_RECOMMENDED"
    else:
        validation_status = "CURRENT"

    # Determine if scrutiny report is stale
    report_stale = False
    if not latest_rep:
        report_status = "NOT_GENERATED"
    elif latest_ver and latest_rep.created_at < latest_ver.created_at:
        report_stale = True
        report_status = "STALE_REGENERATION_RECOMMENDED"
    else:
        report_status = "CURRENT"

    overall_fresh = not (validation_stale or report_stale)

    return {
        "application_id": application_id,
        "current_version": current_ver_num,
        "is_overall_fresh": overall_fresh,
        "validation_status": validation_status,
        "validation_stale": validation_stale,
        "latest_validation_run_id": latest_val.id if latest_val else None,
        "report_status": report_status,
        "report_stale": report_stale,
        "latest_report_id": latest_rep.id if latest_rep else None,
    }
