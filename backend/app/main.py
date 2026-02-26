from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.database import engine, Base, SessionLocal
from app.models import User
from app.auth import hash_password
from app.config import settings
from app.routers import auth_router, clients, invoices, payments, dashboard, reports

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Tables are created above
        pass
    finally:
        db.close()
    yield


app = FastAPI(
    title="DTDC Credit Client Monitor",
    description="Internal system to track credit clients, invoices, and payments",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Parse CORS origins from settings (comma-separated string)
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(clients.router)
app.include_router(invoices.router)
app.include_router(payments.router)
app.include_router(dashboard.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}

