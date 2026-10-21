from datetime import datetime, timezone
import uuid
from typing import TYPE_CHECKING, Optional, Dict, Any, List
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User
    from app.models.document_page import DocumentPage


class ProcessingRun(Base):
    __tablename__ = "processing_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    trigger: Mapped[str] = mapped_column(String(50), default="UPLOAD", nullable=False)  # UPLOAD, RETRY, REPROCESS
    status: Mapped[str] = mapped_column(
        String(50), default="QUEUED", index=True, nullable=False
    )  # QUEUED, PROCESSING, COMPLETED, COMPLETED_WITH_WARNINGS, PARTIAL, FAILED, MANUAL_REVIEW_REQUIRED
    pipeline_version: Mapped[str] = mapped_column(String(50), default="0.1.0", nullable=False)
    warnings: Mapped[Optional[List[Any]]] = mapped_column(JSON, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    safe_error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quality_summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    requested_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="processing_runs")
    requester: Mapped[Optional["User"]] = relationship("User", foreign_keys=[requested_by])
    pages: Mapped[List["DocumentPage"]] = relationship(
        "DocumentPage", back_populates="processing_run", cascade="all, delete-orphan", order_by="DocumentPage.page_number"
    )
