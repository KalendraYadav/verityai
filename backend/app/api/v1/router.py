from fastapi import APIRouter
from app.api.v1.endpoints import health, institutions, categories, applications

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(institutions.router, prefix="/institutions", tags=["Institutions"])
api_router.include_router(categories.router, prefix="/application-categories", tags=["Application Categories"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
