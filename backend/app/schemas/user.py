import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        # bcrypt silently ignores everything past 72 bytes
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password too long (max 72 bytes)")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    skill_level: str | None = None
    preferred_tcg: str | None = None

    @field_validator("skill_level")
    @classmethod
    def valid_skill_level(cls, v: str | None) -> str | None:
        if v is not None and v not in {"beginner", "intermediate", "advanced"}:
            raise ValueError(f"Invalid skill_level: {v}")
        return v

    @field_validator("preferred_tcg")
    @classmethod
    def valid_preferred_tcg(cls, v: str | None) -> str | None:
        if v is not None and v not in {"pokemon", "magic", "yugioh", "lorcana", "onepiece"}:
            raise ValueError(f"Invalid preferred_tcg: {v}")
        return v


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    is_premium: bool
    skill_level: str | None = None
    preferred_tcg: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    """Token is delivered via httpOnly cookie, never in the body."""

    user: UserResponse
