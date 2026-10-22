import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, JSON, Float, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ExternalPortalConfig(Base):
    """
    Configuration and discovery metadata for external regulatory portals and gateway adapters.
    Distinguishes Local Synthetic, Configurable External REST, and Official Portal Stubs.
    """
    __tablename__ = "external_portal_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_type: Mapped[str] = mapped_column(String(50), nullable=False)  # LOCAL_SYNTHETIC, CONFIGURABLE_REST, OFFICIAL_STUB
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auth_type: Mapped[str] = mapped_column(String(50), default="NONE", nullable=False)  # NONE, API_KEY, BEARER_TOKEN, MUTUAL_TLS
    statutory_authority: Mapped[str] = mapped_column(String(255), default="Simulated Authority (SIH 2026 Prototype)", nullable=False)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    max_response_bytes: Mapped[int] = mapped_column(Integer, default=1048576, nullable=False)  # 1MB limit
    requires_https: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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

    # Relationships
    sync_logs: Mapped[List["ExternalPortalSyncLog"]] = relationship(
        "ExternalPortalSyncLog", back_populates="portal_config", cascade="all, delete-orphan"
    )


class ExternalPortalSyncLog(Base):
    """
    Append-only audit record of outbound regulatory portal requests, health probes,
    synchronization lookups, and security events. Never stores credentials.
    """
    __tablename__ = "external_portal_sync_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    portal_config_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("external_portal_configs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # HEALTH_CHECK, APPLICATION_VERIFY, RECORD_LOOKUP
    target_identifier: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # SUCCESS, FAILED, TIMEOUT, BLOCKED_SSRF, UNCONFIGURED
    http_status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    request_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # Strictly sanitized, no secrets
    initiated_by_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    portal_config: Mapped["ExternalPortalConfig"] = relationship(
        "ExternalPortalConfig", back_populates="sync_logs"
    )
