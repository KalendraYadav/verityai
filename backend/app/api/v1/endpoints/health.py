from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db

router = APIRouter()


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="System and Database Health Check",
    response_description="Current service and database status",
)
def get_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Check the health of the VerityAI service and verify database connectivity.
    """
    db_status = "connected"
    db_engine = "sqlite" if settings.DATABASE_URL.startswith("sqlite") else "postgresql"
    db_error = None

    try:
        # Simple connectivity probe
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "error"
        db_error = str(e)

    overall_status = "healthy" if db_status == "connected" else "degraded"

    response: Dict[str, Any] = {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": db_status,
            "engine": db_engine,
        },
    }

    if db_error:
        response["database"]["error"] = db_error

    return response
