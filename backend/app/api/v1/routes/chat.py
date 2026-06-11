import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.deps import DB, CurrentUser, rate_limit_user
from app.core.config import settings
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.chat import ChatRequest, ChatResponse, ConversationDetail, ConversationSummary
from app.services.ai.openai_service import chat_completion, chat_completion_stream

router = APIRouter(prefix="/chat", tags=["chat"])


def _extract_history(conv) -> list[dict]:
    """Safe: only called on convs loaded with selectinload(messages)."""
    return [{"role": m.role, "content": m.content} for m in conv.messages]


_chat_rate_limit = Depends(rate_limit_user("chat", times=settings.RATE_LIMIT_PER_MINUTE))


@router.post("/", response_model=ChatResponse, dependencies=[_chat_rate_limit])
async def send_message(payload: ChatRequest, current_user: CurrentUser, db: DB) -> ChatResponse:
    repo = ConversationRepository(db)

    if payload.conversation_id:
        conv = await repo.get_by_id(payload.conversation_id, current_user.id)
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        history = _extract_history(conv)
    else:
        conv = await repo.create(current_user.id, payload.tcg_context)
        history = []

    await repo.add_message(conv.id, "user", payload.message)

    ai_response = await chat_completion(payload.message, history, payload.tcg_context or conv.tcg_context)

    msg = await repo.add_message(conv.id, "assistant", ai_response, meta={"model": settings.HF_MODEL})

    if not conv.title and not history:
        title = payload.message[:60] + ("..." if len(payload.message) > 60 else "")
        await repo.update_title(conv.id, title)

    return ChatResponse(conversation_id=conv.id, message_id=msg.id, content=ai_response)


@router.post("/stream", dependencies=[_chat_rate_limit])
async def send_message_stream(payload: ChatRequest, current_user: CurrentUser, db: DB) -> StreamingResponse:
    repo = ConversationRepository(db)

    if payload.conversation_id:
        conv = await repo.get_by_id(payload.conversation_id, current_user.id)
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        history = _extract_history(conv)
    else:
        conv = await repo.create(current_user.id, payload.tcg_context)
        history = []

    await repo.add_message(conv.id, "user", payload.message)

    if not conv.title and not history:
        title = payload.message[:60] + ("..." if len(payload.message) > 60 else "")
        await repo.update_title(conv.id, title)

    # Commit early so the conversation is immediately visible in history
    await db.commit()

    # The request-scoped session is torn down before the stream body runs
    # (FastAPI closes yield-dependencies on endpoint return), so capture
    # plain values now and persist with a dedicated session afterwards.
    conv_id = conv.id
    tcg_context = payload.tcg_context or conv.tcg_context

    collected_chunks: list[str] = []

    async def event_generator():
        try:
            async for chunk in chat_completion_stream(payload.message, history, tcg_context):
                collected_chunks.append(chunk)
                yield f"data: {chunk}\n\n"
        except Exception as exc:
            # Never leak internal exception details to the client
            logger.error("HuggingFace streaming error: %s", exc, exc_info=True)
            yield "data: [ERROR] AI service temporarily unavailable\n\n"

        # Always reach [DONE] so the frontend gets the conversation ID
        full_response = "".join(collected_chunks)
        if full_response:
            try:
                async with AsyncSessionLocal() as session:
                    await ConversationRepository(session).add_message(
                        conv_id, "assistant", full_response,
                        meta={"model": settings.HF_MODEL, "streamed": True},
                    )
                    await session.commit()
            except Exception as exc:
                logger.error("Failed to persist streamed response for %s: %s", conv_id, exc)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Conversation-Id": str(conv.id)},
    )


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(current_user: CurrentUser, db: DB) -> list[ConversationSummary]:
    repo = ConversationRepository(db)
    convs = await repo.list_by_user(current_user.id)
    return [
        ConversationSummary(
            id=c.id,
            title=c.title,
            tcg_context=c.tcg_context,
            last_message=c.messages[-1].content[:100] if c.messages else None,
            created_at=c.created_at,
            message_count=len(c.messages),
        )
        for c in convs
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: uuid.UUID, current_user: CurrentUser, db: DB) -> ConversationDetail:
    repo = ConversationRepository(db)
    conv = await repo.get_by_id(conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        tcg_context=conv.tcg_context,
        messages=[{"role": m.role, "content": m.content} for m in conv.messages],
        created_at=conv.created_at,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: uuid.UUID, current_user: CurrentUser, db: DB) -> None:
    repo = ConversationRepository(db)
    deleted = await repo.delete(conversation_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
