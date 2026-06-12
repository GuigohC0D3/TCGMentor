import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message


class ConversationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: uuid.UUID, tcg_context: str | None = None) -> Conversation:
        conv = Conversation(user_id=user_id, tcg_context=tcg_context)
        self.db.add(conv)
        await self.db.flush()
        return conv

    async def get_by_id(self, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation | None:
        result = await self.db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self, user_id: uuid.UUID, limit: int = 50, search: str | None = None
    ) -> list[Conversation]:
        query = (
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        if search:
            query = query.where(Conversation.title.ilike(f"%{search}%"))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def add_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        meta: dict | None = None,
    ) -> Message:
        msg = Message(conversation_id=conversation_id, role=role, content=content, meta=meta)
        self.db.add(msg)
        await self.db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(updated_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
        return msg

    async def delete_last_assistant_message(self, conversation_id: uuid.UUID) -> None:
        last = (
            select(Message.id)
            .where(Message.conversation_id == conversation_id, Message.role == "assistant")
            .order_by(Message.created_at.desc())
            .limit(1)
            .scalar_subquery()
        )
        await self.db.execute(delete(Message).where(Message.id == last))

    async def update_title(self, conversation_id: uuid.UUID, title: str) -> None:
        await self.db.execute(
            update(Conversation).where(Conversation.id == conversation_id).values(title=title)
        )

    async def delete(self, conversation_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        return result.rowcount > 0
