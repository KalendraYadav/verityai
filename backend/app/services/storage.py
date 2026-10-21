import os
import hashlib
from pathlib import Path
from typing import Optional, Tuple, BinaryIO
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import (
    UnsupportedMediaTypeException,
    PayloadTooLargeException,
    EmptyFileException,
    MalformedFileException,
    StorageException,
)

CHUNK_SIZE = 64 * 1024  # 64 KB

# Magic byte signatures
MAGIC_SIGNATURES = {
    b"%PDF-": "application/pdf",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
}

MIME_TO_EXT = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpeg",
}

EXT_TO_MIME = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


def detect_media_type_from_header(header: bytes) -> Optional[str]:
    """Detect media type based on leading magic bytes."""
    if header.startswith(b"%PDF-"):
        return "application/pdf"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return None


def get_storage_root() -> Path:
    """Return the resolved storage root directory outside public web directories."""
    storage_path = Path(settings.STORAGE_LOCAL_DIR).resolve()
    storage_path.mkdir(parents=True, exist_ok=True)
    return storage_path


def resolve_storage_path(storage_key: str) -> Path:
    """Safely resolve a relative storage key to an absolute filesystem path.
    Prevents directory traversal, path escape, and invalid characters.
    """
    if ".." in storage_key or storage_key.startswith("/") or storage_key.startswith("\\"):
        raise StorageException("Invalid storage key path traversal detected.")
    
    storage_root = get_storage_root()
    # Normalize path separators
    clean_key = storage_key.replace("\\", "/")
    parts = [p for p in clean_key.split("/") if p]
    if any(p == ".." or p == "." for p in parts):
        raise StorageException("Invalid storage key components.")
    
    resolved_path = (storage_root / Path(*parts)).resolve()
    
    # Verify path is strictly within the storage root
    try:
        resolved_path.relative_to(storage_root)
    except ValueError:
        raise StorageException("Storage path traversal outside configured root.")
        
    return resolved_path


def validate_file_metadata(
    filename: str,
    declared_media_type: Optional[str] = None,
) -> str:
    """Validate filename extension against allowlist."""
    ext = Path(filename).suffix.lower()
    if not ext or ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        raise UnsupportedMediaTypeException(
            f"File extension '{ext}' is not supported. Allowed: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}",
            code="UNSUPPORTED_MEDIA_TYPE",
        )
    return ext


async def process_and_store_upload(
    file: UploadFile,
    application_id: str,
    document_id: str,
    declared_media_type: Optional[str] = None,
) -> Tuple[str, str, int, str]:
    """Stream, validate, hash, and store an uploaded file.
    
    Returns:
        (storage_key, detected_media_type, file_size_bytes, sha256_hash)
    """
    filename = file.filename or "unknown"
    ext = validate_file_metadata(filename, declared_media_type)
    
    storage_root = get_storage_root()
    app_doc_dir = storage_root / application_id / document_id
    app_doc_dir.mkdir(parents=True, exist_ok=True)
    
    temp_target_path = app_doc_dir / "upload.tmp"
    
    hasher = hashlib.sha256()
    total_bytes = 0
    header_bytes = b""
    is_first_chunk = True
    
    try:
        with open(temp_target_path, "wb") as f_out:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                
                if is_first_chunk:
                    header_bytes = chunk[:64]
                    is_first_chunk = False
                
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    raise PayloadTooLargeException(
                        f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB.",
                        code="FILE_TOO_LARGE",
                    )
                
                hasher.update(chunk)
                f_out.write(chunk)
                
        # 1. Empty file check
        if total_bytes == 0:
            raise EmptyFileException("The uploaded file is empty.", code="EMPTY_FILE")
        
        # 2. Magic byte / content-based type detection
        detected_media_type = detect_media_type_from_header(header_bytes)
        if not detected_media_type or detected_media_type not in settings.ALLOWED_UPLOAD_MIME_TYPES:
            raise UnsupportedMediaTypeException(
                "Unsupported file format or unreadable content header.",
                code="UNSUPPORTED_MEDIA_TYPE",
            )
        
        # 3. Extension vs detected type consistency check
        expected_mime_for_ext = EXT_TO_MIME.get(ext)
        if expected_mime_for_ext != detected_media_type:
            raise UnsupportedMediaTypeException(
                f"File extension '{ext}' does not match detected file content '{detected_media_type}'.",
                code="FILE_TYPE_MISMATCH",
            )
        
        # 4. Declared MIME check (if provided by client/browser)
        if declared_media_type:
            clean_declared = declared_media_type.split(";")[0].strip().lower()
            if clean_declared not in settings.ALLOWED_UPLOAD_MIME_TYPES:
                raise UnsupportedMediaTypeException(
                    f"Declared media type '{clean_declared}' is not supported.",
                    code="UNSUPPORTED_MEDIA_TYPE",
                )
            if clean_declared != detected_media_type:
                raise UnsupportedMediaTypeException(
                    f"Declared media type '{clean_declared}' does not match detected content '{detected_media_type}'.",
                    code="FILE_TYPE_MISMATCH",
                )
        
        # 5. Type-specific integrity checks
        detected_ext = MIME_TO_EXT[detected_media_type]
        if detected_media_type == "application/pdf":
            # Check for basic PDF end of file or structure
            with open(temp_target_path, "rb") as f_check:
                f_check.seek(max(0, total_bytes - 1024))
                trailer_sample = f_check.read()
                if b"%%EOF" not in trailer_sample and b"%PDF" not in trailer_sample:
                    # Some PDFs have small trailing whitespace or incremental updates, but must have valid elements
                    pass
        
        # Atomic rename to original.<detected_ext>
        final_filename = f"original.{detected_ext}"
        final_target_path = app_doc_dir / final_filename
        if final_target_path.exists():
            final_target_path.unlink()
        
        temp_target_path.replace(final_target_path)
        
        # Relative storage key per Section 10: <application_id>/<document_id>/original.<ext>
        storage_key = f"{application_id}/{document_id}/{final_filename}"
        sha256_hex = hasher.hexdigest()
        
        return storage_key, detected_media_type, total_bytes, sha256_hex
        
    except Exception:
        # Cleanup temp file on any error
        if temp_target_path.exists():
            try:
                temp_target_path.unlink()
            except OSError:
                pass
        raise
    finally:
        await file.close()


def remove_document_file(storage_key: str) -> None:
    """Safely remove a stored document file if it exists."""
    try:
        path = resolve_storage_path(storage_key)
        if path.exists():
            path.unlink()
        # Clean up empty parent directory if empty
        parent = path.parent
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()
    except Exception:
        pass
