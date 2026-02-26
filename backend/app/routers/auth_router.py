from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserOut
from app.auth import verify_password, hash_password, create_access_token
from app.deps import require_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@router.post("/register", response_model=UserOut)
def register(body: UserCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    exists = db.query(User).filter(User.username == body.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        username=body.username,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user



