from fastapi import APIRouter

from app.api.v1.routes import auth, chat

router = APIRouter()
router.include_router(auth.router)
router.include_router(chat.router)
