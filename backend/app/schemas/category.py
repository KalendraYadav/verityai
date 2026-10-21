from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict


class ApplicationCategoryResponse(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    required_document_types: List[Any] = []
    required_declared_fields: List[Any] = []
    provenance: str
    enabled: bool

    model_config = ConfigDict(from_attributes=True)
