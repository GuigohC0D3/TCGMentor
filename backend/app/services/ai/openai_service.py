import json
import logging
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.ai.prompt_builder import build_history_messages, build_system_prompt
from app.services.cards import SUPPORTED_CARD_TCGS, search_cards

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    base_url=settings.HF_BASE_URL,
    api_key=settings.HF_TOKEN,
)

CARD_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "search_cards",
        "description": (
            "Search the official card database for real cards of the current TCG. "
            "Use it whenever you want to reference a specific card's exact text, "
            "cost, or stats instead of relying on memory."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Card name (full or partial)"},
                "limit": {"type": "integer", "description": "Max results (1-5)", "default": 3},
            },
            "required": ["query"],
        },
    },
}


async def chat_completion(
    message: str,
    history: list[dict],
    tcg_context: str | None = None,
    skill_level: str | None = None,
) -> str:
    messages = _build_messages(message, history, tcg_context, skill_level)
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
    skill_level: str | None = None,
) -> AsyncGenerator[str, None]:
    messages = _build_messages(message, history, tcg_context, skill_level)

    # Card lookup tool only when a supported game is selected
    use_tools = tcg_context in SUPPORTED_CARD_TCGS
    if use_tools:
        try:
            async for chunk in _stream_with_card_tool(messages, tcg_context):
                yield chunk
            return
        except Exception as exc:
            # Provider may not support tools (or tool round failed): fall back to plain
            logger.warning("Tool-calling stream failed, falling back: %s", exc)

    async for chunk in _plain_stream(messages):
        yield chunk


async def _plain_stream(messages: list[dict]) -> AsyncGenerator[str, None]:
    stream = await client.chat.completions.create(
        model=settings.HF_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1500,
        stream=True,
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def _stream_with_card_tool(
    messages: list[dict], tcg: str
) -> AsyncGenerator[str, None]:
    stream = await client.chat.completions.create(
        model=settings.HF_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1500,
        stream=True,
        tools=[CARD_SEARCH_TOOL],
        tool_choice="auto",
    )

    tool_calls: dict[int, dict] = {}
    content_parts: list[str] = []

    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta.content:
            content_parts.append(delta.content)
            yield delta.content
        for tc in delta.tool_calls or []:
            entry = tool_calls.setdefault(
                tc.index, {"id": tc.id or "", "name": "", "arguments": ""}
            )
            if tc.id:
                entry["id"] = tc.id
            if tc.function and tc.function.name:
                entry["name"] += tc.function.name
            if tc.function and tc.function.arguments:
                entry["arguments"] += tc.function.arguments

    if not tool_calls:
        return

    # Execute lookups and ask the model to answer with the real card data
    followup = list(messages)
    followup.append(
        {
            "role": "assistant",
            "content": "".join(content_parts) or None,
            "tool_calls": [
                {
                    "id": c["id"] or f"call_{i}",
                    "type": "function",
                    "function": {"name": c["name"], "arguments": c["arguments"]},
                }
                for i, c in sorted(tool_calls.items())
            ],
        }
    )
    for i, c in sorted(tool_calls.items()):
        try:
            args = json.loads(c["arguments"] or "{}")
        except json.JSONDecodeError:
            args = {}
        results = await search_cards(tcg, str(args.get("query", "")), int(args.get("limit", 3)))
        followup.append(
            {
                "role": "tool",
                "tool_call_id": c["id"] or f"call_{i}",
                "content": json.dumps(results) if results else "No cards found.",
            }
        )

    async for chunk in _plain_stream(followup):
        yield chunk


async def generate_conversation_title(first_message: str, first_response: str) -> str | None:
    """Short LLM-generated title for a new conversation. Best-effort: None on failure."""
    try:
        response = await client.chat.completions.create(
            model=settings.HF_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Generate a short title (max 6 words, no quotes, no punctuation at the "
                        "end, same language as the user) summarizing this conversation."
                    ),
                },
                {
                    "role": "user",
                    "content": f"User: {first_message[:500]}\nAssistant: {first_response[:500]}",
                },
            ],
            temperature=0.3,
            max_tokens=24,
        )
        title = (response.choices[0].message.content or "").strip().strip('"')
        return title[:80] or None
    except Exception as exc:
        logger.warning("Title generation failed: %s", exc)
        return None


def _build_messages(
    message: str,
    history: list[dict],
    tcg_context: str | None,
    skill_level: str | None = None,
) -> list[dict]:
    system_prompt = build_system_prompt(tcg_context, skill_level)
    history_messages = build_history_messages(history)
    return [
        {"role": "system", "content": system_prompt},
        *history_messages,
        {"role": "user", "content": message},
    ]
