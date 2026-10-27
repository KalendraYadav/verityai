from datetime import datetime, timezone
import uuid
from typing import TYPE_CHECKING, Optional, List, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.integration_client import IntegrationClient


class IntegrationScrutinyJob(Base):
    """
    Persistent scrutiny job initiated through the independent VerityAI Gateway API (/api/v1/integrations).
    Decoupled from internal portal user and application entities, allowing arbitrary external
    platforms to submit dossiers, query status, and retrieve evidence-linked findings.

    Invariants:
    - client_id: Identifies the authorized external integration tenant.
    - external_reference: Caller-supplied tracking identifier (e.g., EXT-2026-001).
    - idempotency_key: Prevents accidental duplicate submission on retry.
    - Cross-client tenant isolation: One client can never inspect or retrieve another's jobs.
    """
    __tablename__ = "integration_scrutiny_jobs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: f"VAI-JOB-{uuid.uuid4().hex[:8].upper()}"
    )
    client_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("integration_clients.client_id", ondelete="CASCADE"), index=True, nullable=False
    )
    external_reference: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    category_code: Mapped[str] = mapped_column(String(50), default="ENGINEERING_AND_TECHNOLOGY", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", index=True, nullable=False)
    stage: Mapped[str] = mapped_column(String(50), default="INTAKE", nullable=False)

    submitted_documents: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    declared_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    rule_results: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    findings: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    summary: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    provider_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    report_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    safe_error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    internal_application_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
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
    client: Mapped["IntegrationClient"] = relationship("IntegrationClient", back_populates="jobs")
