from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.category import ApplicationCategory
from app.schemas.common import DataResponse
from app.schemas.category import ApplicationCategoryResponse

router = APIRouter()


@router.get("", response_model=DataResponse[List[ApplicationCategoryResponse]])
def list_categories(db: Session = Depends(get_db)):
    """List application categories."""
    stmt = select(ApplicationCategory).where(ApplicationCategory.enabled == True).order_by(ApplicationCategory.name)
    categories = db.scalars(stmt).all()
    return DataResponse(data=[ApplicationCategoryResponse.model_validate(c) for c in categories])
