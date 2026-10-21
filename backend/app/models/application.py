from datetime import datetime, timezone
import uuid
from typing import TYPE_CHECKING, Optional, Dict, Any, List
from sqlalchemy import String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.institution import Institution
    from app.models.category import ApplicationCategory
    from app.models.user import User
    from app.models.audit import AuditEvent


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_reference: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    institution_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("institutions.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    category_code: Mapped[str] = mapped_column(
        String(50), ForeignKey("application_categories.code", ondelete="RESTRICT"), index=True, nullable=False
    )
    academic_year: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    lifecycle_status: Mapped[str] = mapped_column(String(50), default="DRAFT", index=True, nullable=False)
    pipeline_status: Mapped[str] = mapped_column(String(50), default="NOT_STARTED", index=True, nullable=False)
    declared_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_reviewer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    data_origin: Mapped[str] = mapped_column(String(50), default="SYNTHETIC_DEMO", nullable=False)
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
    institution: Mapped["Institution"] = relationship("Institution", back_populates="applications")
    category: Mapped["ApplicationCategory"] = relationship("ApplicationCategory", back_populates="applications")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by], back_populates="created_applications")
    assigned_reviewer: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assigned_reviewer_id], back_populates="assigned_applications"
    )
    audit_events: Mapped[List["AuditEvent"]] = relationship("AuditEvent", back_populates="application")
