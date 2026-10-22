from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response, Request, status, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import verify_password, hash_password, create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import DataResponse
from app.schemas.auth import (
    LoginRequest,
    UserResponse,
    ChangePasswordRequest,
)
from app.api.deps import get_current_user
from app.services.audit import record_audit_event

router = APIRouter()


@router.post(
    "/login",
    response_model=DataResponse[UserResponse],
    summary="Authenticate user and set secure session cookie",
)
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate user with email and password. Sets HttpOnly session cookie."""
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))

    if not user or not verify_password(payload.password, user.password_hash):
        record_audit_event(
            db=db,
            event_type="USER_LOGIN_FAILED",
            actor_type="ANONYMOUS",
            metadata={"email": payload.email, "ip": request.client.host if request.client else None},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email address or password.",
            },
        )

    if not user.is_active:
        record_audit_event(
            db=db,
            event_type="USER_LOGIN_BLOCKED",
            actor_id=user.id,
            actor_type="USER",
            metadata={"reason": "ACCOUNT_DISABLED"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_DISABLED",
                "message": "User account is deactivated. Contact an administrator.",
            },
        )

    # Generate JWT Token
    token = create_access_token(
        subject=user.id,
        role=user.role,
        email=user.email,
    )

    # Set HttpOnly, SameSite=Lax Cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/",
    )

    user.last_login_at = datetime.now(timezone.utc)
    record_audit_event(
        db=db,
        event_type="USER_LOGIN_SUCCESS",
        actor_id=user.id,
        actor_type="USER",
        metadata={"role": user.role, "email": user.email},
    )
    db.commit()
    db.refresh(user)

    return DataResponse(data=UserResponse.model_validate(user))


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Sign out and invalidate session cookie",
)
def logout(
    response: Response,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clear HttpOnly session cookie and log logout audit event."""
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )

    record_audit_event(
        db=db,
        event_type="USER_LOGOUT",
        actor_id=current_user.id,
        actor_type="USER",
        metadata={"email": current_user.email},
    )
    db.commit()

    return {"message": "Signed out successfully."}


@router.get(
    "/me",
    response_model=DataResponse[UserResponse],
    summary="Get current authenticated user profile",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Returns the authenticated profile of the user making the request."""
    return DataResponse(data=UserResponse.model_validate(current_user))


@router.post(
    "/change-password",
    response_model=DataResponse[UserResponse],
    summary="Change password for current user",
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify current password and set new Argon2 password hash."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_CURRENT_PASSWORD",
                "message": "Current password verification failed.",
            },
        )

    current_user.password_hash = hash_password(payload.new_password)
    current_user.updated_at = datetime.now(timezone.utc)

    record_audit_event(
        db=db,
        event_type="USER_PASSWORD_CHANGED",
        actor_id=current_user.id,
        actor_type="USER",
        metadata={"email": current_user.email},
    )
    db.commit()
    db.refresh(current_user)

    return DataResponse(data=UserResponse.model_validate(current_user))
