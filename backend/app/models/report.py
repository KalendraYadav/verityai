import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import Column, String, DateTime, Integer, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ScrutinyReport(Base):
    __tablename__ = "scrutiny_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    report_type = Column(String(50), nullable=False, default="SCRUTINY_DOSSIER")  # SCRUTINY_DOSSIER, SUMMARY_JSON, etc.
    format = Column(String(20), nullable=False, default="PDF")  # PDF, JSON
    storage_path = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    summary_snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.now())

    application = relationship("Application", backref="reports")
    generated_by = relationship("User", backref="generated_reports")
