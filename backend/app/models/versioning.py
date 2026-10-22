from datetime import datetime, timezone
import uuid
from typing import TYPE_CHECKING, Optional, Dict, Any, List
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.document import Document
    from app.models.user import User


class ApplicationVersion(Base):
    """
    Historical snapshot of an institutional application at a specific milestone or modification.
    Enforces monotonically increasing revision numbers per application.
    """
    __tablename__ = "application_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), index=True, nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    change_summary: Mapped[str] = mapped_column(String(255), nullable=False)
    changed_fields: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    snapshot_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("application_id", "version_number", name="uq_app_version_number"),
    )

    # Relationships
    application: Mapped["Application"] = relationship("Application", backref="versions")
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id])


class DocumentRevision(Base):
    """
    Historical revision of an uploaded supporting document.
    Preserves original uploaded files while tracking revisions and content hashes.
    """
    __tablename__ = "document_revisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uploaded_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("document_id", "revision_number", name="uq_doc_revision_number"),
    )

    # Relationships
    document: Mapped["Document"] = relationship("Document", backref="revisions")
    uploaded_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[uploaded_by_id])
