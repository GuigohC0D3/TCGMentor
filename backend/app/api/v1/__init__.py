from fastapi import APIRouter

from app.api.v1.routes import auth, cards, chat, decks, users

router = APIRouter()
router.include_router(auth.router)
router.include_router(chat.router)
router.include_router(decks.router)
router.include_router(cards.router)
router.include_router(users.router)
