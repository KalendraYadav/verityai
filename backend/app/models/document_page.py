from datetime import datetime, timezone
import uuid
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.processing_run import ProcessingRun


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    processing_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("processing_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    text_source: Mapped[str] = mapped_column(String(50), nullable=False)  # DIGITAL_TEXT, OCR, NONE
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    clean_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    char_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ocr_mean_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rotation_applied: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="SUCCEEDED"
    )  # SUCCEEDED, SUCCEEDED_WITH_WARNINGS, FAILED, TIMED_OUT, SKIPPED
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    detected_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # en, hi, mixed, und
    language_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    translated_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    translation_provider: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("processing_run_id", "page_number", name="uq_document_pages_run_page"),
    )

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="pages")
    processing_run: Mapped["ProcessingRun"] = relationship("ProcessingRun", back_populates="pages")
