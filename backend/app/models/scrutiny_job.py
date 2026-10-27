import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.user import User


class ScrutinyJob(Base):
    """
    Persistent scrutiny job tracking asynchronous and orchestrated execution of the
    VerityAI scrutiny pipeline (deterministic validation + AI cross-document anomaly detection).
    Enforces state machine transitions, duplicate prevention, and retry quotas.
    """
    __tablename__ = "scrutiny_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"JOB-{uuid.uuid4().hex[:8].upper()}")
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    job_type: Mapped[str] = mapped_column(String(50), default="FULL_SCRUTINY", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", index=True, nullable=False)
    triggered_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    safe_error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stage_details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    results_summary: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
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
    application: Mapped["Application"] = relationship("Application", back_populates="scrutiny_jobs")
    initiator: Mapped["User"] = relationship("User")
