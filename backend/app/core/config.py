from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "VerityAI"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:80",
    ]

    # Database
    DATABASE_URL: str = "sqlite:///./var/verityai.db"

    # Security & Auth
    JWT_SECRET_KEY: str = "change-this-insecure-secret-key-for-dev-only-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Storage & Uploads
    STORAGE_LOCAL_DIR: str = "./var/uploads"
    STORAGE_ROOT: str = "./var/uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB default per Section 18.1
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = [".pdf", ".png", ".jpg", ".jpeg"]
    ALLOWED_UPLOAD_MIME_TYPES: List[str] = ["application/pdf", "image/png", "image/jpeg"]

    # Optional AI Provider (Graceful offline degradation)
    LLM_ENABLED: bool = False
    LLM_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3.2"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
