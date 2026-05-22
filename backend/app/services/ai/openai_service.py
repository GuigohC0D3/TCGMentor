from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.ai.prompt_builder import build_history_messages, build_system_prompt

client = AsyncOpenAI(
    base_url=settings.HF_BASE_URL,
    api_key=settings.HF_TOKEN,
)


async def chat_completion(
    message: str,
    history: list[dict],
    tcg_context: str | None = None,
) -> str:
    messages = _build_messages(message, history, tcg_context)
    response = await client.chat.completions.create(
        model=settings.HF_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1500,
    )
    return response.choices[0].message.content or ""


async def chat_completion_stream(
    message: str,
    history: list[dict],
    tcg_context: str | None = None,
) -> AsyncGenerator[str, None]:
    messages = _build_messages(message, history, tcg_context)
    stream = await client.chat.completions.create(
        model=settings.HF_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1500,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def _build_messages(
    message: str,
    history: list[dict],
    tcg_context: str | None,
) -> list[dict]:
    system_prompt = build_system_prompt(tcg_context)
    history_messages = build_history_messages(history)
    return [
        {"role": "system", "content": system_prompt},
        *history_messages,
        {"role": "user", "content": message},
    ]
