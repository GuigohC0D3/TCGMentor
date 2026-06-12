from fastapi import APIRouter

from app.api.deps import DB, CurrentUser
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=UserResponse)
async def update_me(payload: UserUpdate, current_user: CurrentUser, db: DB) -> UserResponse:
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.skill_level is not None:
        current_user.skill_level = payload.skill_level
    if payload.preferred_tcg is not None:
        current_user.preferred_tcg = payload.preferred_tcg
    await db.flush()
    return UserResponse.model_validate(current_user)
