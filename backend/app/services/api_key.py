import secrets
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Tuple, Optional, List
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.integration_client import IntegrationClient
from app.services.audit import record_audit_event


SYSTEM_PEPPER = "VerityAI-SIH2026-Pepper-Secure-Entropy"


def _hash_secret(raw_secret: str, salt: str) -> str:
    """Compute PBKDF2-HMAC-SHA256 hash using salt and system pepper."""
    combined_salt = f"{salt}:{SYSTEM_PEPPER}".encode("utf-8")
    return hashlib.pbkdf2_hmac(
        "sha256",
        raw_secret.encode("utf-8"),
        combined_salt,
        iterations=100_000
    ).hex()


def generate_credentials() -> Tuple[str, str, str, str, str]:
    """
    Generate cryptographically secure client_id and raw secret.
    Returns: (client_id, raw_secret, salt, secret_hash, secret_prefix)
    """
    client_id = f"vai_client_{secrets.token_hex(8)}"
    raw_secret = f"vai_sec_{secrets.token_urlsafe(32)}"
    salt = secrets.token_hex(16)
    secret_hash = _hash_secret(raw_secret, salt)
    secret_prefix = raw_secret[:12] + "..."
    return client_id, raw_secret, salt, secret_hash, secret_prefix


def create_api_client(
    db: Session,
    client_name: str,
    description: Optional[str] = None,
    scopes: Optional[List[str]] = None,
    created_by: Optional[str] = None,
    custom_client_id: Optional[str] = None,
) -> Tuple[IntegrationClient, str]:
    """
    Register a new external API client.
    Returns (IntegrationClient, raw_secret).
    IMPORTANT: raw_secret is returned ONLY ONCE upon creation and is NEVER persisted in plaintext.
    """
    client_id, raw_secret, salt, secret_hash, secret_prefix = generate_credentials()
    if custom_client_id:
        client_id = custom_client_id

    assigned_scopes = scopes or ["scrutiny:create", "scrutiny:read", "documents:upload"]

    client = IntegrationClient(
        client_id=client_id,
        client_name=client_name.strip(),
        description=description.strip() if description else None,
        salt=salt,
        secret_hash=secret_hash,
        secret_prefix=secret_prefix,
        scopes=assigned_scopes,
        is_active=True,
        created_by=created_by,
    )
    db.add(client)

    record_audit_event(
        db=db,
        event_type="API_CLIENT_CREATED",
        actor_id=created_by or "SYSTEM",
        actor_type="USER" if created_by else "SYSTEM",
        entity_type="INTEGRATION_CLIENT",
        entity_id=client_id,
        metadata={"client_name": client_name, "scopes": assigned_scopes},
    )

    db.commit()
    db.refresh(client)
    return client, raw_secret


def rotate_api_client_secret(
    db: Session,
    client_id: str,
    actor_id: Optional[str] = None,
) -> Tuple[IntegrationClient, str]:
    """Rotate the secret for an active API client. Returns (client, new_raw_secret)."""
    client = db.scalar(select(IntegrationClient).where(IntegrationClient.client_id == client_id))
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CLIENT_NOT_FOUND", "message": f"Integration client '{client_id}' not found."},
        )

    if not client.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CLIENT_INACTIVE", "message": "Cannot rotate secret for a revoked/inactive client."},
        )

    _, new_raw_secret, new_salt, new_secret_hash, new_secret_prefix = generate_credentials()

    client.salt = new_salt
    client.secret_hash = new_secret_hash
    client.secret_prefix = new_secret_prefix
    client.updated_at = datetime.now(timezone.utc)

    record_audit_event(
        db=db,
        event_type="API_CLIENT_SECRET_ROTATED",
        actor_id=actor_id or "SYSTEM",
        actor_type="USER" if actor_id else "SYSTEM",
        entity_type="INTEGRATION_CLIENT",
        entity_id=client_id,
        metadata={"client_name": client.client_name},
    )

    db.commit()
    db.refresh(client)
    return client, new_raw_secret


def revoke_api_client(
    db: Session,
    client_id: str,
    actor_id: Optional[str] = None,
) -> IntegrationClient:
    """Deactivate and revoke an API client."""
    client = db.scalar(select(IntegrationClient).where(IntegrationClient.client_id == client_id))
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CLIENT_NOT_FOUND", "message": f"Integration client '{client_id}' not found."},
        )

    client.is_active = False
    client.revoked_at = datetime.now(timezone.utc)
    client.updated_at = datetime.now(timezone.utc)

    record_audit_event(
        db=db,
        event_type="API_CLIENT_REVOKED",
        actor_id=actor_id or "SYSTEM",
        actor_type="USER" if actor_id else "SYSTEM",
        entity_type="INTEGRATION_CLIENT",
        entity_id=client_id,
        metadata={"client_name": client.client_name},
    )

    db.commit()
    db.refresh(client)
    return client


def authenticate_api_key(db: Session, raw_key_token: Optional[str]) -> IntegrationClient:
    """
    Authenticate an incoming API key string.
    Expected format:
      "vai_client_...:vai_sec_..." OR Bearer token containing the colon-delimited pair.
    Performs constant-time comparison against the stored hash.
    Raises HTTP 401 on missing, malformed, invalid, or revoked credentials.
    """
    if not raw_key_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "MISSING_API_KEY", "message": "API Key is required. Provide X-API-Key header."},
        )

    clean_token = raw_key_token.strip()
    if clean_token.startswith("Bearer "):
        clean_token = clean_token.split(" ", 1)[1].strip()

    if ":" not in clean_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_API_KEY_FORMAT", "message": "API Key must follow format 'client_id:client_secret'."},
        )

    client_id, candidate_secret = clean_token.split(":", 1)
    client_id = client_id.strip()
    candidate_secret = candidate_secret.strip()

    client = db.scalar(select(IntegrationClient).where(IntegrationClient.client_id == client_id))
    if not client:
        # Constant-time dummy computation to prevent timing side-channel attacks on client existence
        _hash_secret(candidate_secret, "dummy_salt_for_timing_safety")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_API_KEY", "message": "Invalid or revoked API credentials."},
        )

    if not client.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "API_CLIENT_REVOKED", "message": "API client credentials have been revoked."},
        )

    candidate_hash = _hash_secret(candidate_secret, client.salt)
    if not hmac.compare_digest(candidate_hash, client.secret_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_API_KEY", "message": "Invalid or revoked API credentials."},
        )

    # Validated: update last_used_at
    client.last_used_at = datetime.now(timezone.utc)
    db.commit()

    return client


def verify_client_scope(client: IntegrationClient, required_scope: str) -> None:
    """Assert that client possesses the required scope or 'admin:all'."""
    client_scopes = client.scopes or []
    if "admin:all" in client_scopes:
        return
    if required_scope not in client_scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "INSUFFICIENT_SCOPES",
                "message": f"Client '{client.client_id}' lacks required scope '{required_scope}'.",
            },
        )
