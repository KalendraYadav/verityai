from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.application import Application


def generate_application_reference(db: Session, academic_year: str = None) -> str:
    """Generate human-friendly application reference formatted VAI-YYYY-XXXX."""
    year = datetime.now(timezone.utc).year
    prefix = f"VAI-{year}-"
    
    # Count existing applications with this year's prefix
    count_stmt = select(func.count(Application.id)).where(Application.application_reference.startswith(prefix))
    total_existing = db.scalar(count_stmt) or 0
    
    reference = f"{prefix}{total_existing + 1:04d}"
    
    # Ensure uniqueness in case of race condition
    while db.scalar(select(Application.id).where(Application.application_reference == reference)):
        total_existing += 1
        reference = f"{prefix}{total_existing + 1:04d}"
        
    return reference
