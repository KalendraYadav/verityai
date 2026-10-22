from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.common import DataResponse, PaginatedResponse, MetaPagination
from app.schemas.auth import (
    UserResponse,
    UserCreateRequest,
    UserStatusUpdateRequest,
)
from app.api.deps import require_roles
from app.core.security import hash_password
from app.services.audit import record_audit_event

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[UserResponse],
    summary="List users (Admin only)",
)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None, description="Filter by user role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("ADMIN")),
):
    """List system user accounts with role and status filtering. Strictly requires ADMIN role."""
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role.upper())
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    total = len(list(db.scalars(stmt).all()))
    stmt = stmt.order_by(desc(User.created_at)).offset((page - 1) * page_size).limit(page_size)
    users = list(db.scalars(stmt).all())

    return PaginatedResponse(
        data=[UserResponse.model_validate(u) for u in users],
        meta=MetaPagination(page=page, page_size=page_size, total=total),
    )


@router.post(
    "",
    response_model=DataResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account (Admin only)",
)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("ADMIN")),
):
    """Create a new user account with assigned role and Argon2 password. Strictly requires ADMIN role."""
    existing = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "USER_ALREADY_EXISTS",
                "message": f"User with email '{payload.email}' already exists.",
            },
        )

    valid_roles = ("ADMIN", "REVIEWER", "VIEWER", "INSTITUTION_USER")
    if payload.role.upper() not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_ROLE",
                "message": f"Role '{payload.role}' is invalid. Allowed: {', '.join(valid_roles)}",
            },
        )

    new_user = User(
        email=payload.email.lower().strip(),
        display_name=payload.display_name.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role.upper(),
        institution_id=payload.institution_id,
        is_active=True,
        data_origin="SYNTHETIC_DEMO",
    )
    db.add(new_user)
    db.flush()

    record_audit_event(
        db=db,
        event_type="USER_CREATED",
        actor_id=admin_user.id,
        actor_type="USER",
        metadata={"created_user_id": new_user.id, "email": new_user.email, "role": new_user.role},
    )
    db.commit()
    db.refresh(new_user)

    return DataResponse(data=UserResponse.model_validate(new_user))


@router.patch(
    "/{user_id}/status",
    response_model=DataResponse[UserResponse],
    summary="Activate or deactivate a user account (Admin only)",
)
def update_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("ADMIN")),
):
    """Enable or disable user access. Inactive users are rejected upon subsequent API requests."""
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "USER_NOT_FOUND",
                "message": f"User '{user_id}' not found.",
            },
        )

    # Protect against self-deactivation by admin
    if target_user.id == admin_user.id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "SELF_DEACTIVATION_PROHIBITED",
                "message": "Administrators cannot deactivate their own account.",
            },
        )

    target_user.is_active = payload.is_active
    target_user.updated_at = datetime.now(timezone.utc)

    record_audit_event(
        db=db,
        event_type="USER_STATUS_UPDATED",
        actor_id=admin_user.id,
        actor_type="USER",
        metadata={"target_user_id": target_user.id, "is_active": payload.is_active},
    )
    db.commit()
    db.refresh(target_user)

    return DataResponse(data=UserResponse.model_validate(target_user))
