from typing import Optional, List
import uuid
from fastapi import APIRouter, Depends, Query, Form, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_optional_current_user, get_current_user, require_roles
from app.models.user import User
from app.models.application import Application
from app.models.document import Document
from app.schemas.versioning import (
    ApplicationVersionItem,
    VersionComparisonResponse,
    DocumentRevisionItem,
    ApplicationFreshnessResponse,
)
from app.services.versioning import (
    get_application_versions,
    get_application_version,
    compare_application_versions,
    get_document_revisions,
    record_document_revision,
    get_application_freshness_status,
)
from app.services.storage import process_and_store_upload
from app.core.exceptions import NotFoundException, ConflictException, ValidationException

router = APIRouter()


@router.get("/applications/{application_id}/versions", response_model=List[ApplicationVersionItem])
def list_application_versions(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve full chronological version history for an application."""
    try:
        return get_application_versions(db, application_id)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/applications/{application_id}/versions/{version_number}", response_model=ApplicationVersionItem)
def get_version_details(
    application_id: str,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve details and snapshot for a specific application version."""
    try:
        return get_application_version(db, application_id, version_number)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/applications/{application_id}/versions-compare", response_model=VersionComparisonResponse)
def compare_versions(
    application_id: str,
    v1: int = Query(..., description="First version number to compare"),
    v2: int = Query(..., description="Second version number to compare"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Compare two application versions and return field-level differences."""
    try:
        return compare_application_versions(db, application_id, v1, v2)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/applications/{application_id}/freshness", response_model=ApplicationFreshnessResponse)
def get_application_freshness(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Check if the current application version is fresh or if prior validation
    and scrutiny reports are stale and require re-evaluation.
    """
    try:
        return get_application_freshness_status(db, application_id)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/documents/{document_id}/revisions", response_model=List[DocumentRevisionItem])
def list_document_revisions(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve full revision history for a document."""
    try:
        return get_document_revisions(db, document_id)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/documents/{document_id}/revisions", response_model=DocumentRevisionItem, status_code=status.HTTP_201_CREATED)
async def upload_document_revision(
    document_id: str,
    file: UploadFile = File(...),
    change_reason: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Upload a new revision for an existing document.
    Enforces upload constraints, computes SHA-256, prevents duplicate uploads,
    and preserves previous file versions.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    if current_user and current_user.role == "REVIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Reviewers are not permitted to upload document revisions."}
        )

    if current_user and current_user.role == "INSTITUTION_USER":
        app_obj = db.get(Application, doc.application_id)
        if not app_obj or current_user.institution_id != app_obj.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "Access to upload revisions for another institution is denied."}
            )

    actor_id = current_user.id if current_user else doc.uploaded_by
    revision_doc_id = f"REV-{uuid.uuid4().hex[:8].upper()}"

    try:
        storage_key, detected_media_type, file_size_bytes, sha256_hex = await process_and_store_upload(
            file=file,
            application_id=doc.application_id,
            document_id=revision_doc_id,
            declared_media_type=file.content_type,
        )

        rev = record_document_revision(
            db=db,
            document_id=doc.id,
            original_filename=file.filename or doc.original_filename,
            storage_key=storage_key,
            file_size_bytes=file_size_bytes,
            sha256=sha256_hex,
            change_reason=change_reason,
            actor_id=actor_id,
        )
        return rev
    except ConflictException as ce:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ce))
    except ValidationException as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
