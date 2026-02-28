import secrets

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://neondb_owner:npg_82unsOLTvAkH@ep-green-sea-a1nmo6q0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    JWT_SECRET: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"  # Hardcoded fallback, overridden by .env in prod
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    CORS_ORIGINS: str = "*"  # Comma-separated origins, or * for all
    MAX_UPLOAD_MB: int = 5

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

