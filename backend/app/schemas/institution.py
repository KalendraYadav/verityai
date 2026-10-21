from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class InstitutionBase(BaseModel):
    institution_name: str
    institution_identifier: Optional[str] = None
    institution_type: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None


class InstitutionCreate(InstitutionBase):
    pass


class InstitutionResponse(InstitutionBase):
    id: str
    status: str
    data_origin: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InstitutionBrief(BaseModel):
    id: str
    institution_name: str
    institution_identifier: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
