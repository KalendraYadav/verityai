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
        self.code = code
        self.message = message
        super().__init__(
            status_code=status_code,
            detail={
                "code": code,
                "message": message,
                "details": [d.model_dump() if hasattr(d, "model_dump") else d for d in (details or [])],
            },
            headers=headers,
        )

    def to_dict(self) -> dict:
        return self.detail if isinstance(self.detail, dict) else {"code": self.code, "message": self.message, "details": []}


class NotFoundException(VerityAPIException):
    def __init__(self, code: str, message: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, code=code, message=message)


class BadRequestException(VerityAPIException):
    def __init__(self, code: str, message: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, code=code, message=message)


class ForbiddenException(VerityAPIException):
    def __init__(self, code: str = "FORBIDDEN", message: str = "Access forbidden."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, code=code, message=message)


class ValidationException(VerityAPIException):
    def __init__(self, message: str, details: Optional[List[ErrorDetail]] = None, code: str = "VALIDATION_ERROR"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code=code,
            message=message,
            details=details,
        )


class ConflictException(VerityAPIException):
    def __init__(self, code: str, message: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, code=code, message=message)


class UnsupportedMediaTypeException(VerityAPIException):
    def __init__(self, message: str, code: str = "UNSUPPORTED_MEDIA_TYPE"):
        super().__init__(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, code=code, message=message)


class PayloadTooLargeException(VerityAPIException):
    def __init__(self, message: str, code: str = "FILE_TOO_LARGE"):
        super().__init__(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, code=code, message=message)


class EmptyFileException(VerityAPIException):
    def __init__(self, message: str = "The uploaded file is empty.", code: str = "EMPTY_FILE"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, code=code, message=message)


class MalformedFileException(VerityAPIException):
    def __init__(self, message: str = "The uploaded file is corrupt or unreadable.", code: str = "MALFORMED_FILE"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, code=code, message=message)


class StorageException(VerityAPIException):
    def __init__(self, message: str = "A storage error occurred while saving the file.", code: str = "STORAGE_ERROR"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, code=code, message=message)

