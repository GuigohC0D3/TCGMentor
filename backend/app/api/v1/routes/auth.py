from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DB, CurrentUser
from app.core.config import settings
from app.core.rate_limit import rate_limit_ip
from app.core.security import AUTH_COOKIE, create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import AuthResponse, UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

# Constant-time login: always run one bcrypt check even when the email
# does not exist, so response timing does not reveal registered emails.
_DUMMY_HASH = hash_password("timing-equalizer-not-a-real-password")

_COOKIE_SECURE = settings.ENVIRONMENT.lower() == "production"


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE,
        value=token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_ip("register", times=5))],
)
async def register(payload: UserCreate, db: DB, response: Response) -> AuthResponse:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        # Race with a concurrent registration for the same email
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    _set_auth_cookie(response, create_access_token(str(user.id)))
    return AuthResponse(user=UserResponse.model_validate(user))


@router.post(
    "/login",
    response_model=AuthResponse,
    dependencies=[Depends(rate_limit_ip("login", times=10))],
)
async def login(payload: UserLogin, db: DB, response: Response) -> AuthResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    password_ok = verify_password(
        payload.password, user.hashed_password if user else _DUMMY_HASH
    )
    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    _set_auth_cookie(response, create_access_token(str(user.id)))
    return AuthResponse(user=UserResponse.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(
        AUTH_COOKIE, path="/", httponly=True, secure=_COOKIE_SECURE, samesite="lax"
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
