"""
VerityAI — Document Integrity and Digital Signature Inspection Service.

Provides honest, transparent analysis of PDF digital signatures per ISO 32000-1 and PAdES standards.
Distinguishes signature presence, byte range integrity, certificate extraction, and trust verification.
Strictly adheres to Phase F guidelines:
- Never marks a document authentic merely because it contains a signature image.
- Never claims a digital signature is valid if the certificate chain has not been verified against a trusted Root CA.
- Explicitly labels unverified trust states as 'UNVERIFIED_PROTOTYPE_ENVIRONMENT'.
- Recognizes that physical documents signed in ink require visual inspection and are not fraudulent.
"""

import re
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

from app.models.document import Document
from app.services.storage import resolve_storage_path


def parse_pdf_date(date_str: str) -> Optional[str]:
    """Parse PDF date format: D:YYYYMMDDHHmmSSOHH'mm' into ISO format."""
    if not date_str:
        return None
    cleaned = date_str.strip()
    if cleaned.startswith("D:"):
        cleaned = cleaned[2:]
    # Match YYYYMMDDHHMMSS or YYYYMMDD
    m = re.match(r"^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2}))?", cleaned)
    if m:
        year, month, day = m.group(1), m.group(2), m.group(3)
        hour = m.group(4) or "00"
        minute = m.group(5) or "00"
        second = m.group(6) or "00"
        return f"{year}-{month}-{day}T{hour}:{minute}:{second}Z"
    return None


def inspect_pdf_digital_signatures(file_bytes: bytes) -> Dict[str, Any]:
    """
    Inspect raw PDF bytes for cryptographic digital signature dictionaries.
    Examines /ByteRange, /Contents, /SubFilter, declared signers, and incremental modifications.
    """
    report: Dict[str, Any] = {
        "signature_present": False,
        "signature_count": 0,
        "signatures": [],
        "file_size_bytes": len(file_bytes),
        "file_sha256": hashlib.sha256(file_bytes).hexdigest(),
        "integrity_status": "NO_CRYPTOGRAPHIC_SIGNATURE",
        "trust_verification_status": "NOT_APPLICABLE",
        "explanation": "No cryptographic digital signature (/ByteRange) was detected in the document. Document may be a physical scan requiring visual inspection of ink signatures and institutional seals.",
    }

    if not file_bytes or len(file_bytes) < 16:
        report["explanation"] = "File too small or empty to contain valid PDF signatures."
        return report

    # 1. Search for /ByteRange entries in PDF structure
    # /ByteRange [ 0 12345 23456 78901 ]
    byte_range_pattern = re.compile(
        rb"/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]"
    )
    matches = list(byte_range_pattern.finditer(file_bytes))

    if not matches:
        return report

    report["signature_present"] = True
    report["signature_count"] = len(matches)
    total_len = len(file_bytes)

    for idx, match in enumerate(matches):
        offset1 = int(match.group(1))
        len1 = int(match.group(2))
        offset2 = int(match.group(3))
        len2 = int(match.group(4))

        sig_end = offset2 + len2
        has_post_sig_bytes = total_len > sig_end
        post_sig_byte_count = total_len - sig_end if has_post_sig_bytes else 0

        # Look around match position for enclosing signature dictionary
        start_context = max(0, match.start() - 300)
        end_context = min(total_len, match.end() + 1500)
        context = file_bytes[start_context:end_context]

        # Extract SubFilter (format standard)
        subfilter = "UNKNOWN"
        sub_match = re.search(rb"/SubFilter\s*/([A-Za-z0-9_.]+)", context)
        if sub_match:
            subfilter = sub_match.group(1).decode("ascii", errors="ignore")

        # Extract declared Signer Name
        name_match = re.search(rb"/Name\s*\(([^)]+)\)", context)
        declared_signer = (
            name_match.group(1).decode("utf-8", errors="ignore")
            if name_match
            else None
        )

        # Extract declared signing time
        date_match = re.search(rb"/M\s*\(([^)]+)\)", context)
        signing_time_raw = (
            date_match.group(1).decode("ascii", errors="ignore")
            if date_match
            else None
        )
        signing_time_iso = parse_pdf_date(signing_time_raw) if signing_time_raw else None

        # Extract Reason
        reason_match = re.search(rb"/Reason\s*\(([^)]+)\)", context)
        reason = (
            reason_match.group(1).decode("utf-8", errors="ignore")
            if reason_match
            else None
        )

        # Extract Location
        loc_match = re.search(rb"/Location\s*\(([^)]+)\)", context)
        location = (
            loc_match.group(1).decode("utf-8", errors="ignore")
            if loc_match
            else None
        )

        # Determine byte-range validity
        if offset1 != 0 or len1 <= 0 or offset2 <= (offset1 + len1) or len2 <= 0:
            coverage_status = "MALFORMED_BYTE_RANGE"
        elif has_post_sig_bytes:
            # Bytes appended after signed range
            coverage_status = "INCREMENTAL_UPDATE_AFTER_SIGNATURE"
        else:
            coverage_status = "COVERS_FULL_DOCUMENT"

        sig_entry = {
            "signature_index": idx + 1,
            "format_subfilter": subfilter,
            "declared_signer": declared_signer,
            "signing_time": signing_time_iso,
            "signing_reason": reason,
            "signing_location": location,
            "byte_range": [offset1, len1, offset2, len2],
            "coverage_status": coverage_status,
            "post_signature_bytes": post_sig_byte_count,
            "certificate_chain_verified": False,
            "trust_verification_note": (
                "Cryptographic signature structure detected. Root CA / CCA India trust chain "
                "verification is not configured in this prototype environment. Signer identity and "
                "certificate validity have NOT been cryptographically verified against a trusted Root CA."
            ),
        }
        report["signatures"].append(sig_entry)

    # Set overall report conclusions
    any_post_sig = any(
        s["coverage_status"] == "INCREMENTAL_UPDATE_AFTER_SIGNATURE"
        for s in report["signatures"]
    )
    any_malformed = any(
        s["coverage_status"] == "MALFORMED_BYTE_RANGE"
        for s in report["signatures"]
    )

    if any_malformed:
        report["integrity_status"] = "MALFORMED_SIGNATURE_STRUCTURE"
        report["trust_verification_status"] = "UNVERIFIED"
        report["explanation"] = (
            "PDF contains a malformed digital signature byte range. Scrutiny officer must manually verify document integrity."
        )
    elif any_post_sig:
        report["integrity_status"] = "INCREMENTAL_DATA_APPENDED"
        report["trust_verification_status"] = "UNVERIFIED_PROTOTYPE_ENVIRONMENT"
        report["explanation"] = (
            "Digital signature detected, but additional data was appended to the file after signing. "
            "Scrutiny officer must inspect document history to confirm no unauthorized alterations occurred."
        )
    else:
        report["integrity_status"] = "DIGITAL_SIGNATURE_PRESENT_UNVERIFIED_TRUST"
        report["trust_verification_status"] = "UNVERIFIED_PROTOTYPE_ENVIRONMENT"
        first_sig = report["signatures"][0]
        signer_info = f" declared by '{first_sig['declared_signer']}'" if first_sig.get("declared_signer") else ""
        report["explanation"] = (
            f"Cryptographic digital signature ({first_sig['format_subfilter']}){signer_info} detected covering document bytes. "
            "Trust chain verification is unconfigured in prototype environment; official certificate authority (CCA) verification required."
        )

    return report


def inspect_stored_document_integrity(
    doc: Document,
) -> Dict[str, Any]:
    """
    Inspects physical file integrity and digital signatures for a stored Document entity.
    Verifies storage SHA-256 matches database record, and inspects PDF signatures if applicable.
    """
    if not doc.storage_key:
        return {
            "document_id": doc.id,
            "filename": doc.original_filename,
            "status": "NO_STORAGE_KEY",
            "sha256_match": False,
            "signature_report": {
                "signature_present": False,
                "integrity_status": "NO_FILE_ON_DISK",
                "explanation": "No storage key assigned to document entity.",
            },
        }

    try:
        file_path = resolve_storage_path(doc.storage_key)
        if not file_path.exists():
            return {
                "document_id": doc.id,
                "filename": doc.original_filename,
                "status": "FILE_NOT_FOUND_ON_DISK",
                "sha256_match": False,
                "signature_report": {
                    "signature_present": False,
                    "integrity_status": "FILE_MISSING",
                    "explanation": f"File '{file_path.name}' not found in storage.",
                },
            }

        file_bytes = file_path.read_bytes()
        actual_hash = hashlib.sha256(file_bytes).hexdigest()
        expected_hash = doc.sha256 or ""
        sha_match = actual_hash.lower() == expected_hash.lower() if expected_hash else True

        # Check if file is PDF
        is_pdf = (
            getattr(doc, "media_type", "") == "application/pdf"
            or file_path.suffix.lower() == ".pdf"
            or file_bytes.startswith(b"%PDF-")
        )

        sig_report = (
            inspect_pdf_digital_signatures(file_bytes)
            if is_pdf
            else {
                "signature_present": False,
                "integrity_status": "NON_PDF_FORMAT",
                "explanation": f"Non-PDF format ({file_path.suffix}); digital signature inspection applies to PDF format.",
            }
        )

        return {
            "document_id": doc.id,
            "filename": doc.original_filename,
            "status": "INSPECTED",
            "file_size": len(file_bytes),
            "sha256_recorded": expected_hash,
            "sha256_actual": actual_hash,
            "sha256_match": sha_match,
            "signature_report": sig_report,
        }
    except Exception as exc:
        return {
            "document_id": doc.id,
            "filename": doc.original_filename,
            "status": "INSPECTION_ERROR",
            "sha256_match": False,
            "signature_report": {
                "signature_present": False,
                "integrity_status": "ERROR",
                "explanation": f"Error inspecting document: {str(exc)}",
            },
        }
