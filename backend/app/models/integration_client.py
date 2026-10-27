from datetime import datetime, timezone
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class IntegrationClient(Base):
    """
    Authorized external API integration client for the independent VerityAI scrutiny platform.
    Represents an integrating system (e.g., Current Institutional Portal, State Directorate Portal,
    or third-party verification consumer).

    Security Invariants:
    - client_id: Non-secret public identifier used to locate client context.
    - secret_hash: PBKDF2/SHA-256 cryptographic hash of the client secret. The raw secret is never stored.
    - secret_prefix: Masked prefix shown in admin UI to identify active credentials.
    - scopes: List of granted capabilities (e.g., scrutiny:create, scrutiny:read).
    - Constant-time secret comparison prevents timing attacks.
    """
    __tablename__ = "integration_clients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    salt: Mapped[str] = mapped_column(String(64), nullable=False)
    secret_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    secret_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    scopes: Mapped[List[str]] = mapped_column(
        JSON,
        default=lambda: ["scrutiny:create", "scrutiny:read", "documents:upload"],
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    rate_limit_per_minute: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    jobs: Mapped[List["IntegrationScrutinyJob"]] = relationship(
        "IntegrationScrutinyJob", back_populates="client", cascade="all, delete-orphan"
    )
