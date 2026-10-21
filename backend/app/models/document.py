from datetime import datetime, timezone
import uuid
from typing import TYPE_CHECKING, Optional, List, Dict, Any
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.user import User
    from app.models.processing_run import ProcessingRun


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    storage_backend: Mapped[str] = mapped_column(String(50), default="LOCAL", nullable=False)
    file_state: Mapped[str] = mapped_column(String(50), default="PRESENT", nullable=False)  # PRESENT, MISSING, DELETED
    media_type: Mapped[str] = mapped_column(String(100), nullable=False)
    declared_media_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    declared_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    detected_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    detection_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    classification_status: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    classification_basis: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    effective_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    upload_status: Mapped[str] = mapped_column(String(50), default="ACCEPTED", nullable=False)  # ACCEPTED, REJECTED
    processing_status: Mapped[str] = mapped_column(
        String(50), default="QUEUED", index=True, nullable=False
    )  # QUEUED, PROCESSING, COMPLETED, COMPLETED_WITH_WARNINGS, PARTIAL, FAILED, MANUAL_REVIEW_REQUIRED
    extraction_quality_band: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    latest_verification_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    uploaded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
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
    application: Mapped["Application"] = relationship("Application", back_populates="documents")
    uploader: Mapped["User"] = relationship("User", foreign_keys=[uploaded_by])
    processing_runs: Mapped[List["ProcessingRun"]] = relationship(
        "ProcessingRun", back_populates="document", cascade="all, delete-orphan", order_by="desc(ProcessingRun.started_at)"
    )
