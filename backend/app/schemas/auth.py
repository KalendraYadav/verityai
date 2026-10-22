from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered user email address")
    password: str = Field(..., min_length=6, description="User password")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    display_name: str
    role: str
    institution_id: Optional[str] = None
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime


class UserCreateRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    display_name: str = Field(..., min_length=2, max_length=100, description="Full display name")
    password: str = Field(..., min_length=8, description="Initial password (min 8 chars)")
    role: str = Field(default="REVIEWER", description="ADMIN, REVIEWER, VIEWER, INSTITUTION_USER")
    institution_id: Optional[str] = Field(None, description="Optional bound institution ID")


class UserStatusUpdateRequest(BaseModel):
    is_active: bool = Field(..., description="Whether account is active")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current plaintext password")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")


class TokenPayload(BaseModel):
    sub: str
    email: str
    role: str
    exp: int
    iat: int
