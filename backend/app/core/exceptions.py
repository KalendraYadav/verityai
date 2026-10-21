from typing import Optional, List, Any
from fastapi import HTTPException, status
from app.schemas.common import ErrorDetail


class VerityAPIException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[List[ErrorDetail]] = None,
        headers: Optional[dict] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "code": code,
                "message": message,
                "details": [d.model_dump() if hasattr(d, "model_dump") else d for d in (details or [])],
            },
            headers=headers,
        )


class NotFoundException(VerityAPIException):
    def __init__(self, code: str, message: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, code=code, message=message)


class ValidationException(VerityAPIException):
    def __init__(self, message: str, details: Optional[List[ErrorDetail]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=message,
            details=details,
        )


class ConflictException(VerityAPIException):
    def __init__(self, code: str, message: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, code=code, message=message)
