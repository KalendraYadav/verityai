from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel

T = TypeVar("T")


class MetaPagination(BaseModel):
    page: int
    page_size: int
    total: int


class DataResponse(BaseModel, Generic[T]):
    data: T


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    meta: MetaPagination


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    issue: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    request_id: Optional[str] = None


class ErrorResponse(BaseModel):
    error: ErrorBody
