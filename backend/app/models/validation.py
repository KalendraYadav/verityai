from datetime import datetime, date, timezone
import uuid
from typing import TYPE_CHECKING, Optional, Dict, Any, List
from sqlalchemy import (
    String,
    Boolean,
    Text,
    Date,
    DateTime,
    ForeignKey,
    JSON,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.document import Document
    from app.models.user import User


class ValidationRule(Base):
    __tablename__ = "validation_rules"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    rule_code: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    rule_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    rule_type: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )  # REQUIRED_DOCUMENT, REQUIRED_FIELD, EXPIRY_CHECK, FIELD_EQUALS_APPLICATION
    category: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )  # REQUIRED_DOCUMENT, REQUIRED_FIELD, EXPIRY, CONSISTENCY, etc.
    applies_to: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(20), default="HIGH", nullable=False
    )  # LOW, MEDIUM, HIGH
    on_fail_status: Mapped[str] = mapped_column(
        String(20), default="FAIL", nullable=False
    )  # FAIL, NEEDS_REVIEW
    provenance: Mapped[str] = mapped_column(
        String(50), default="ILLUSTRATIVE", nullable=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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

    __table_args__ = (
        UniqueConstraint("rule_code", "rule_version", name="uq_validation_rule_code_version"),
    )

    # Relationships
    results: Mapped[List["RuleResult"]] = relationship("RuleResult", back_populates="rule")


class ValidationRun(Base):
    __tablename__ = "validation_runs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50), default="RUNNING", nullable=False
    )  # RUNNING, COMPLETED, FAILED
    trigger: Mapped[str] = mapped_column(
        String(50), default="MANUAL", nullable=False
    )  # MANUAL, AUTOMATED, DOCUMENT_ADDED
    evaluation_date: Mapped[date] = mapped_column(Date, nullable=False)
    pipeline_version: Mapped[str] = mapped_column(String(50), default="0.2.0", nullable=False)
    rule_snapshot: Mapped[List[Any]] = mapped_column(JSON, default=list, nullable=False)
    summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    safe_error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    triggered_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="validation_runs")
    results: Mapped[List["RuleResult"]] = relationship(
        "RuleResult", back_populates="validation_run", cascade="all, delete-orphan"
    )
    trigger_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[triggered_by])


class RuleResult(Base):
    __tablename__ = "rule_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    validation_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("validation_runs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    rule_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("validation_rules.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    rule_code: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    rule_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    rule_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    target_key: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )  # PASS, FAIL, NEEDS_REVIEW, NOT_APPLICABLE, UNABLE_TO_EVALUATE
    severity: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    expected_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    observed_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), index=True, nullable=True
    )
    source_page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    inputs_status: Mapped[str] = mapped_column(
        String(50), default="ALL_AVAILABLE", nullable=False
    )  # ALL_AVAILABLE, PARTIAL, UNAVAILABLE
    human_review_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unresolved_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    evaluation_date_used: Mapped[date] = mapped_column(Date, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "validation_run_id", "rule_code", "target_key", name="uq_rule_results_run_rule_target"
        ),
    )

    # Relationships
    validation_run: Mapped["ValidationRun"] = relationship("ValidationRun", back_populates="results")
    application: Mapped["Application"] = relationship("Application", back_populates="rule_results")
    rule: Mapped["ValidationRule"] = relationship("ValidationRule", back_populates="results")
    source_document: Mapped[Optional["Document"]] = relationship("Document")
