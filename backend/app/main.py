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


import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables gracefully
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.error(f"Failed to connect to database or create tables on startup: {e}")
        
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

# Parse CORS origins from settings (comma-separated string or * for all)
if settings.CORS_ORIGINS.strip() == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import APIRouter

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router.router)
api_router.include_router(clients.router)
api_router.include_router(invoices.router)
api_router.include_router(payments.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)

app.include_router(api_router)


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

@app.get("/health")
def health():
    return {"status": "ok"}

# Serve the static files from the build directory
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # Catch-all route to serve the React app
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Ignore API routes gracefully
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}
        
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"detail": "Frontend not found"}

