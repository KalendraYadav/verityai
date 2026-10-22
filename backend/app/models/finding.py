import uuid
from datetime import datetime, timezone
from typing import Optional, List, Any
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Float,
    JSON,
    Text,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ExtractedField(Base):
    """Table 10: extracted_fields
    Versioned candidate fields extracted from document pages.
    """
    __tablename__ = "extracted_fields"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    processing_run_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("processing_runs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    field_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    raw_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    normalized_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    normalization_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # OK, AMBIGUOUS, UNPARSEABLE, EMPTY
    date_parse_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # UNAMBIGUOUS, AMBIGUOUS, PARTIAL, UNPARSEABLE
    candidate_values: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    extraction_method: Mapped[str] = mapped_column(String(50), nullable=False, default="REGEX")  # LABEL, REGEX, CONTEXT_RULE, MODEL_ASSISTED, MANUAL_ENTRY
    rule_or_pattern_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_basis: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    extraction_status: Mapped[str] = mapped_column(String(50), nullable=False, default="EXTRACTED")  # EXTRACTED, LOW_CONFIDENCE, AMBIGUOUS, NOT_FOUND, NOT_ATTEMPTED
    review_status: Mapped[str] = mapped_column(String(50), nullable=False, default="UNREVIEWED")  # UNREVIEWED, CONFIRMED, CORRECTED, REJECTED
    field_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    supersedes_field_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("extracted_fields.id", ondelete="SET NULL"), nullable=True
    )
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    document = relationship("Document", backref="extracted_fields")

    __table_args__ = (
        Index("ix_extracted_fields_doc_current", "document_id", "is_current"),
        Index("ix_extracted_fields_key_current", "field_key", "is_current"),
    )


class Finding(Base):
    """Table 14: findings
    Reviewer-facing items derived from non-pass validation results,
    cross-document mismatches, quality anomalies, or authenticity indicators.
    """
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    validation_run_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("validation_runs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rule_result_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("rule_results.id", ondelete="SET NULL"), nullable=True
    )
    rule_code: Mapped[str] = mapped_column(String(100), nullable=False, default="ANOMALY_DETECTOR")
    rule_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    finding_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="INDICATOR"
    )  # RULE_RESULT, INDICATOR, CROSS_DOCUMENT_MISMATCH, QUALITY_WARNING
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="ANOMALY"
    )  # CONSISTENCY, DATE_SANITY, DUPLICATE, ANOMALY, EXTRACTION_QUALITY
    indicator_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    finding_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    result_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="NEEDS_REVIEW"
    )  # FAIL, NEEDS_REVIEW, UNABLE_TO_EVALUATE
    severity: Mapped[str] = mapped_column(
        String(20), nullable=False, default="MEDIUM"
    )  # CRITICAL, HIGH, MEDIUM, LOW
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    expected_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    observed_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_action: Mapped[str] = mapped_column(
        Text, nullable=False, default="Review discrepancy against supporting records."
    )
    requires_human_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    evidence_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="OPEN", index=True
    )  # OPEN, UNDER_REVIEW, CONFIRMED, DISMISSED, RESOLVED, AWAITING_EVIDENCE
    review_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    carried_over_from_finding_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("findings.id", ondelete="SET NULL"), nullable=True
    )
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    detection_method: Mapped[str] = mapped_column(
        String(50), nullable=False, default="DETERMINISTIC_HEURISTIC"
    )  # DETERMINISTIC_HEURISTIC, RULE_CROSS_CHECK, OPTIONAL_AI_ADVISORY
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    application = relationship("Application", backref="findings")
    document = relationship("Document", backref="findings")
    evidence_items = relationship(
        "FindingEvidence", back_populates="finding", cascade="all, delete-orphan", order_by="FindingEvidence.sort_order"
    )

    __table_args__ = (
        Index("ix_findings_app_current", "application_id", "is_current"),
    )


class FindingEvidence(Base):
    """Table 15: finding_evidence
    Evidence records linking a finding to its underlying document, page, or values.
    """
    __tablename__ = "finding_evidence"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    finding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    evidence_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # DOCUMENT_FIELD, APPLICATION_FIELD, RECORD_COMPARISON, RULE_APPLICATION, FILE_HASH, PAGE_REFERENCE, EXTRACTION_STATE
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    field_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("extracted_fields.id", ondelete="SET NULL"), nullable=True
    )
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rule_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rule_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    raw_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    normalized_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    finding = relationship("Finding", back_populates="evidence_items")
