"""AI deck analysis: tier rating, tips, combos and matchup spread."""

import asyncio
import json
import logging
import re

from app.core.config import settings
from app.services.ai.prompt_builder import TCG_CONTEXTS
from app.services.cards import SUPPORTED_CARD_TCGS, search_cards

logger = logging.getLogger(__name__)

VALID_TIERS = {"S", "A", "B", "C"}
_MAX_CARD_LOOKUPS = 15

ANALYSIS_SYSTEM_PROMPT = """You are a competitive {game_name} deck analyst with deep knowledge of the current metagame.
Analyze the deck the user submits and respond with ONLY a JSON object (no markdown fences, no commentary) in exactly this shape:

{{
  "tier": "S" | "A" | "B" | "C",
  "archetype": "short archetype name (e.g. 'Aggro Burn', 'Control Mirror Breaker')",
  "summary": "2-3 sentence overall assessment of the deck",
  "tips": ["actionable tip 1", "actionable tip 2", "..."],
  "combos": [{{"cards": ["Card A", "Card B"], "description": "how the combo works"}}],
  "strong_against": [{{"deck": "archetype name", "reason": "why this deck wins that matchup"}}],
  "weak_against": [{{"deck": "archetype name", "reason": "why this deck loses that matchup"}}],
  "improvements": ["suggested change 1", "suggested change 2"]
}}

Tier meanings: S = top meta contender, A = strong and consistent, B = playable with clear weaknesses, C = fun/casual but uncompetitive.
Give 3-5 tips, 1-4 combos, 2-4 entries in each matchup list, and 2-5 improvements.
Write all text values in the same language the user used for the deck name.
Be honest: most decks are NOT tier S."""


def _format_deck(deck_name: str, cards: list[dict], card_data: list[dict]) -> str:
    lines = [f"Deck name: {deck_name}", "", "Deck list:"]
    lines += [f'- {c["quantity"]}x {c["name"]}' for c in cards]
    if card_data:
        lines += ["", "Verified card data from the official database:"]
        for c in card_data:
            text = (c.get("text") or "").replace("\n", " ")[:300]
            lines.append(f'- {c["name"]} [{c.get("type_line") or "?"}] {text}')
    return "\n".join(lines)


async def _enrich_cards(tcg: str, cards: list[dict]) -> list[dict]:
    """Fetch real data for the first N unique card names (best-effort)."""
    if tcg not in SUPPORTED_CARD_TCGS:
        return []
    names = list(dict.fromkeys(c["name"] for c in cards))[:_MAX_CARD_LOOKUPS]
    results = await asyncio.gather(
        *(search_cards(tcg, name, limit=1) for name in names), return_exceptions=True
    )
    return [r[0] for r in results if isinstance(r, list) and r]


def parse_analysis(raw: str) -> dict:
    """Extract and validate the JSON analysis from the model output."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("No JSON object in analysis output")
    data = json.loads(cleaned[start : end + 1])

    tier = str(data.get("tier", "")).strip().upper()
    data["tier"] = tier if tier in VALID_TIERS else "C"
    data["archetype"] = str(data.get("archetype") or "Unknown")[:100]
    data["summary"] = str(data.get("summary") or "")
    for key in ("tips", "improvements"):
        data[key] = [str(t) for t in data.get(key) or [] if t][:6]
    data["combos"] = [
        {"cards": [str(n) for n in (c.get("cards") or [])], "description": str(c.get("description") or "")}
        for c in data.get("combos") or []
        if isinstance(c, dict)
    ][:5]
    for key in ("strong_against", "weak_against"):
        data[key] = [
            {"deck": str(m.get("deck") or ""), "reason": str(m.get("reason") or "")}
            for m in data.get(key) or []
            if isinstance(m, dict)
        ][:5]
    return {
        k: data[k]
        for k in (
            "tier", "archetype", "summary", "tips", "combos",
            "strong_against", "weak_against", "improvements",
        )
    }


async def analyze_deck(deck_name: str, tcg: str, cards: list[dict]) -> dict:
    """Run the full analysis pipeline: enrich -> prompt -> parse."""
    from app.services.ai.openai_service import client  # late import avoids cycle

    card_data = await _enrich_cards(tcg, cards)
    game_name = TCG_CONTEXTS.get(tcg, tcg)

    response = await client.chat.completions.create(
        model=settings.HF_MODEL,
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT.format(game_name=game_name)},
            {"role": "user", "content": _format_deck(deck_name, cards, card_data)},
        ],
        temperature=0.4,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content or ""
    return parse_analysis(raw)
