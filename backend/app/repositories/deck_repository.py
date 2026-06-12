import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deck import Deck


class DeckRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: uuid.UUID, name: str, tcg: str, cards: list[dict]) -> Deck:
        deck = Deck(user_id=user_id, name=name, tcg=tcg, cards=cards)
        self.db.add(deck)
        await self.db.flush()
        return deck

    async def get_by_id(self, deck_id: uuid.UUID, user_id: uuid.UUID) -> Deck | None:
        result = await self.db.execute(
            select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID, limit: int = 50) -> list[Deck]:
        result = await self.db.execute(
            select(Deck)
            .where(Deck.user_id == user_id)
            .order_by(Deck.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update(self, deck: Deck, name: str | None, cards: list[dict] | None) -> Deck:
        if name is not None:
            deck.name = name
        if cards is not None:
            deck.cards = cards
            # deck changed: previous analysis no longer applies
            deck.analysis = None
            deck.analyzed_at = None
        deck.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return deck

    async def save_analysis(self, deck_id: uuid.UUID, analysis: dict) -> None:
        await self.db.execute(
            update(Deck)
            .where(Deck.id == deck_id)
            .values(analysis=analysis, analyzed_at=datetime.now(timezone.utc))
        )

    async def delete(self, deck_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)
        )
        return result.rowcount > 0
