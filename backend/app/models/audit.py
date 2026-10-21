from datetime import datetime, timezone
import uuid
from typing import TYPE_CHECKING, Optional, Dict, Any
from sqlalchemy import String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.application import Application


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    actor_type: Mapped[str] = mapped_column(String(50), default="USER", nullable=False)  # USER, SYSTEM
    application_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="RESTRICT"), index=True, nullable=True
    )
    document_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSON, nullable=True)

    # Relationships
    actor: Mapped[Optional["User"]] = relationship("User", back_populates="audit_events")
    application: Mapped[Optional["Application"]] = relationship("Application", back_populates="audit_events")
