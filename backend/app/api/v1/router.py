from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    institutions,
    categories,
    applications,
    audit,
    documents,
    validation,
    anomalies,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(institutions.router, prefix="/institutions", tags=["Institutions"])
api_router.include_router(categories.router, prefix="/application-categories", tags=["Application Categories"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
api_router.include_router(audit.router, prefix="/audit-events", tags=["Audit Events"])
api_router.include_router(documents.router, tags=["Documents"])
api_router.include_router(validation.router, tags=["Validation Engine"])
api_router.include_router(anomalies.router, tags=["Anomaly Detection"])

