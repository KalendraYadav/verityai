import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class RegistryRecord(Base):
    """
    Reference record from an authorized regulatory registry or synthetic demo dataset.
    """
    __tablename__ = "registry_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_code = Column(String(64), nullable=False, index=True)  # e.g., "SYNTHETIC_AISHE", "SYNTHETIC_REGULATORY"
    reference_identifier = Column(String(128), nullable=False, index=True)  # e.g., AISHE code, Permanent AICTE ID
    institution_name = Column(String(255), nullable=False, index=True)
    institution_name_normalized = Column(String(255), nullable=False, index=True)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE")  # ACTIVE, AFFILIATED, SUSPENDED, DEREGISTERED
    approved_intake = Column(Integer, nullable=True)
    year_of_establishment = Column(Integer, nullable=True)
    source_dataset = Column(String(128), nullable=False, default="SYNTHETIC_REGISTRY_2026")
    dataset_version = Column(String(64), nullable=False, default="1.0")
    metadata_json = Column(JSON, nullable=True)
    is_stale = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow)


class RegistryVerificationRun(Base):
    """
    Execution run of verifying an institutional application against reference registry records.
    """
    __tablename__ = "registry_verification_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_code = Column(String(64), nullable=False, default="SYNTHETIC_AISHE")
    overall_status = Column(String(50), nullable=False, default="NOT_FOUND")
    # MATCH, MISMATCH, NOT_FOUND, AMBIGUOUS, STALE_REFERENCE, INSUFFICIENT_DATA, PROVIDER_UNAVAILABLE
    summary = Column(Text, nullable=True)
    reference_record_id = Column(String(36), ForeignKey("registry_records.id", ondelete="SET NULL"), nullable=True)
    executed_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    executed_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.now())

    application = relationship("Application", backref="registry_verification_runs")
    reference_record = relationship("RegistryRecord", backref="verification_runs")
    executed_by = relationship("User", backref="executed_registry_runs")
    results = relationship("RegistryVerificationResult", back_populates="run", cascade="all, delete-orphan")


class RegistryVerificationResult(Base):
    """
    Itemized check result comparing specific application fields with registry reference values.
    """
    __tablename__ = "registry_verification_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("registry_verification_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    check_type = Column(String(64), nullable=False)  # IDENTIFIER_MATCH, NAME_MATCH, LOCATION_MATCH, STATUS_ACTIVE, INTAKE_CHECK
    status = Column(String(50), nullable=False)  # MATCH, MISMATCH, NOT_FOUND, AMBIGUOUS, STALE_REFERENCE, INSUFFICIENT_DATA
    application_value = Column(String(255), nullable=True)
    registry_value = Column(String(255), nullable=True)
    explanation = Column(Text, nullable=False)
    discrepancy_details = Column(JSON, nullable=True)
    requires_human_review = Column(Boolean, nullable=False, default=False)
    resolved_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_status = Column(String(50), nullable=False, default="UNRESOLVED")  # UNRESOLVED, ACCEPTED, WAIVED, FLAGGED
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    run = relationship("RegistryVerificationRun", back_populates="results")
    resolved_by = relationship("User", backref="resolved_registry_results")
