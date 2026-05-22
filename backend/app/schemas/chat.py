import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None
    message: str
    tcg_context: str | None = None

    @field_validator("conversation_id", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 4000:
            raise ValueError("Message too long (max 4000 characters)")
        return v

    @field_validator("tcg_context")
    @classmethod
    def valid_tcg_context(cls, v: str | None) -> str | None:
        allowed = {"pokemon", "magic", "yugioh", "lorcana", "onepiece", None}
        if v not in allowed:
            raise ValueError(f"Invalid tcg_context: {v}")
        return v


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    content: str
    role: Literal["assistant"] = "assistant"


class ConversationSummary(BaseModel):
    id: uuid.UUID
    title: str | None
    tcg_context: str | None
    last_message: str | None
    created_at: datetime
    message_count: int

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: uuid.UUID
    title: str | None
    tcg_context: str | None
    messages: list[ChatMessage]
    created_at: datetime

    model_config = {"from_attributes": True}
