import secrets

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://neondb_owner:npg_82unsOLTvAkH@ep-green-sea-a1nmo6q0-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    JWT_SECRET: str = secrets.token_urlsafe(32)  # Generates a random secret if not provided in .env
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    CORS_ORIGINS: str = "*"  # Comma-separated origins, or * for all
    MAX_UPLOAD_MB: int = 5

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

