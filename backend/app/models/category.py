from typing import TYPE_CHECKING, List, Optional, Any
from sqlalchemy import String, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.application import Application


class ApplicationCategory(Base):
    __tablename__ = "application_categories"

    code: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g., EOA_ILLUSTRATIVE
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    required_document_types: Mapped[List[Any]] = mapped_column(JSON, default=list, nullable=False)
    required_declared_fields: Mapped[List[Any]] = mapped_column(JSON, default=list, nullable=False)
    provenance: Mapped[str] = mapped_column(String(50), default="ILLUSTRATIVE", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    applications: Mapped[List["Application"]] = relationship("Application", back_populates="category")
