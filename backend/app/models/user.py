from datetime import datetime, timezone
import uuid
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.institution import Institution
    from app.models.application import Application
    from app.models.audit import AuditEvent


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # INSTITUTION_USER, REVIEWER, ADMIN
    institution_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
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
    institution: Mapped[Optional["Institution"]] = relationship("Institution", back_populates="users")
    created_applications: Mapped[List["Application"]] = relationship(
        "Application", back_populates="creator", foreign_keys="Application.created_by"
    )
    assigned_applications: Mapped[List["Application"]] = relationship(
        "Application", back_populates="assigned_reviewer", foreign_keys="Application.assigned_reviewer_id"
    )
    audit_events: Mapped[List["AuditEvent"]] = relationship("AuditEvent", back_populates="actor")
