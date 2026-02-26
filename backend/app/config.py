import secrets

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://postgres.sqhpbivsznparvkulvjb:YOUR-PASSWORD-HERE@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
    SUPABASE_URL: str = "https://sqhpbivsznparvkulvjb.supabase.co"
    SUPABASE_KEY: str = ""
    JWT_SECRET: str = secrets.token_urlsafe(64)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    CORS_ORIGINS: str = "http://localhost:5173"  # Comma-separated origins
    MAX_UPLOAD_MB: int = 5

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

