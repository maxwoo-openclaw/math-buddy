from pydantic_settings import BaseSettings
from pydantic import field_validator
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./mathbuddy.db"
    SECRET_KEY: str = "math-buddy-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v == "math-buddy-secret-key-change-in-production":
            # Only raise in production when no proper env var is set
            if os.environ.get("ENVIRONMENT") == "production":
                raise ValueError(
                    "SECRET_KEY must be changed from default in production. "
                    "Set a secure random string in .env"
                )
        return v

    class Config:
        env_file = ".env"


settings = Settings()
