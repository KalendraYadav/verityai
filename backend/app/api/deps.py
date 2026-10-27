from typing import Optional, Callable
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User


def get_token_from_request(request: Request) -> Optional[str]:
    """Retrieve JWT access token from HttpOnly cookie or Authorization header."""
    # 1. Check HttpOnly cookie
    token = request.cookies.get("access_token")
    if token:
        return token

    # 2. Fallback to Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()

    return None


def verify_csrf_header(request: Request) -> None:
    """Enforce CSRF custom request header on state-changing requests when using cookie auth."""
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # Check if auth cookie is present
        if "access_token" in request.cookies:
            custom_header = request.headers.get("X-Requested-With")
            if custom_header != "VerityAI":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "CSRF_FAILED",
                        "message": "Missing or invalid custom CSRF header 'X-Requested-With: VerityAI'",
                    },
                )


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the current authenticated user.
    Raises HTTP 401 if token is missing, expired, or invalid.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Authentication required. Please log in.",
            },
        )

    # If cookie authentication is used for a mutating request, verify CSRF header
    if "access_token" in request.cookies and request.method in ("POST", "PUT", "PATCH", "DELETE"):
        verify_csrf_header(request)

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Session is expired or invalid. Please log in again.",
            },
        )

    user_id = payload["sub"]
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "User account no longer exists.",
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_DISABLED",
                "message": "User account is deactivated. Contact an administrator.",
            },
        )

    return user


def get_optional_current_user(
    request: Request,
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Retrieve current user if authenticated, otherwise None without raising 401."""
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None

    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        return None

    return user


get_current_user_optional = get_optional_current_user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """FastAPI dependency factory enforcing role-based permissions."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": f"Action requires one of [{', '.join(allowed_roles)}] role. Your role: {current_user.role}",
                },
            )
        return current_user

    return role_checker


def get_authenticated_api_client(
    request: Request,
    db: Session = Depends(get_db),
) -> "IntegrationClient":
    """Extract and authenticate external API client from X-API-Key or Authorization header."""
    from app.services.api_key import authenticate_api_key
    api_key = request.headers.get("X-API-Key") or request.headers.get("Authorization")
    return authenticate_api_key(db=db, raw_key_token=api_key)


def require_client_scope(required_scope: str) -> Callable[["IntegrationClient"], "IntegrationClient"]:
    """Dependency factory enforcing specific API scope on integration client."""
    def scope_checker(client: "IntegrationClient" = Depends(get_authenticated_api_client)) -> "IntegrationClient":
        from app.services.api_key import verify_client_scope
        verify_client_scope(client, required_scope)
        return client

    return scope_checker
