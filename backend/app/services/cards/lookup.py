"""Real card data from free public TCG APIs, normalized to a common shape.

Normalized card: {name, type_line, text, cost, rarity, set_name, image_url}

Filters are normalized across games:
- card_type: card category (Creature, Trainer, Spell Card, Character...)
- color: Magic color, Pokemon energy type, Yu-Gi-Oh attribute, Lorcana ink
- rarity: not supported by the Yu-Gi-Oh API (ignored there)
"""

import json
import logging

import httpx

from app.core.config import settings
from app.core.rate_limit import get_redis

logger = logging.getLogger(__name__)

# One Piece has no keyless public API; chat tool + deck enrichment skip it gracefully
SUPPORTED_CARD_TCGS = {"pokemon", "magic", "yugioh", "lorcana"}

_CACHE_TTL = 86400  # card data is static; 1 day
# Balance: pokemontcg.io can be slow, but waiting 20s+ feels broken in the UI.
# 10s + one retry caps the worst case at ~20s while most queries return fast.
_TIMEOUT = httpx.Timeout(10.0)

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Shared client: keep-alive connections skip TLS handshakes between searches."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=_TIMEOUT,
            limits=httpx.Limits(max_keepalive_connections=10, keepalive_expiry=60),
        )
    return _client


async def close_client() -> None:
    if _client is not None and not _client.is_closed:
        await _client.aclose()


def _clean(value: str | None) -> str:
    """Strip characters that could break the upstream query syntax.

    Apostrophes are kept: they are part of real card names (Farfetch'd,
    Urza's Saga, Mickey's...) and harmless in every upstream syntax.
    """
    return (value or "").replace('"', "").strip()


async def search_cards(
    tcg: str,
    query: str = "",
    limit: int = 5,
    card_type: str | None = None,
    color: str | None = None,
    rarity: str | None = None,
) -> list[dict]:
    """Search cards by (partial) name and/or filters.

    Returns [] for unsupported TCGs, no criteria, or API errors.
    """
    query = _clean(query)
    card_type, color, rarity = _clean(card_type), _clean(color), _clean(rarity)
    if tcg not in SUPPORTED_CARD_TCGS or not (query or card_type or color or rarity):
        return []
    limit = max(1, min(limit, 30))

    cache_key = f"cards:{tcg}:{query.lower()}:{card_type.lower()}:{color.lower()}:{rarity.lower()}:{limit}"
    redis = get_redis()
    try:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass  # cache is best-effort

    # pokemontcg.io in particular throws intermittent timeouts/5xx under load;
    # one retry recovers most transient failures
    cards: list[dict] | None = None
    client = _get_client()
    for attempt in (1, 2):
        try:
            cards = await _FETCHERS[tcg](client, query, limit, card_type, color, rarity)
            break
        except Exception as exc:
            logger.warning(
                "Card lookup failed (tcg=%s, q=%s, attempt=%d): %s", tcg, query, attempt, exc
            )
    if cards is None:
        return []

    try:
        await redis.set(cache_key, json.dumps(cards), ex=_CACHE_TTL)
    except Exception:
        pass
    return cards


# --- Query builders (pure, unit-testable) ---


def build_scryfall_query(query: str, card_type: str, color: str, rarity: str) -> str:
    parts = [query] if query else []
    if card_type:
        parts.append(f"t:{card_type.lower()}")
    if color:
        parts.append(f"c:{color.lower()}")
    if rarity:
        parts.append(f"r:{rarity.lower()}")
    return " ".join(parts)


def build_pokemon_query(query: str, card_type: str, color: str, rarity: str) -> str:
    # Contains-match each word so partial names hit ("zard" -> Charizard,
    # "charizard ex" -> "Charizard ex"). Wildcards can't go inside quoted
    # phrases, and apostrophes misbehave in wildcard terms, so they become
    # wildcards too (farfetch'd -> *farfetch*d*). Matching is case-insensitive.
    parts = []
    for word in query.split():
        term = word.replace("'", "*")
        parts.append(f"name:*{term}*")
    if card_type:
        parts.append(f'supertype:"{card_type}"')
    if color:
        parts.append(f'types:"{color}"')
    if rarity:
        parts.append(f'rarity:"{rarity}"')
    return " ".join(parts)


def build_ygo_params(query: str, limit: int, card_type: str, color: str) -> dict:
    params: dict = {"num": limit, "offset": 0}
    if query:
        params["fname"] = query
    if card_type:
        params["type"] = card_type
    if color:
        params["attribute"] = color
    return params


def build_lorcana_query(query: str, card_type: str, color: str, rarity: str) -> str:
    parts = [query] if query else []
    if card_type:
        parts.append(f"type:{card_type.lower()}")
    if color:
        parts.append(f"ink:{color.lower()}")
    if rarity:
        parts.append(f"rarity:{rarity.lower().replace(' ', '_')}")
    return " ".join(parts)


# --- Fetchers ---


async def _fetch_magic(
    client: httpx.AsyncClient, query: str, limit: int, card_type: str, color: str, rarity: str
) -> list[dict]:
    res = await client.get(
        f"{settings.SCRYFALL_API_URL}/cards/search",
        params={"q": build_scryfall_query(query, card_type, color, rarity)},
    )
    if res.status_code == 404:  # Scryfall returns 404 for "no results"
        return []
    res.raise_for_status()
    return [
        {
            "name": c.get("name"),
            "type_line": c.get("type_line"),
            "text": c.get("oracle_text"),
            "cost": c.get("mana_cost"),
            "rarity": c.get("rarity"),
            "set_name": c.get("set_name"),
            "image_url": (c.get("image_uris") or {}).get("normal"),
        }
        for c in res.json().get("data", [])[:limit]
    ]


async def _fetch_pokemon(
    client: httpx.AsyncClient, query: str, limit: int, card_type: str, color: str, rarity: str
) -> list[dict]:
    headers = {"X-Api-Key": settings.POKEMONTCG_API_KEY} if settings.POKEMONTCG_API_KEY else {}
    res = await client.get(
        f"{settings.POKEMONTCG_API_URL}/cards",
        params={
            "q": build_pokemon_query(query, card_type, color, rarity),
            "pageSize": limit,
            "orderBy": "-set.releaseDate",
            # Only the fields the normalizer uses: cuts payload ~10x and
            # noticeably speeds up the API's response
            "select": "name,supertype,subtypes,rarity,set,images,attacks,abilities",
        },
        headers=headers,
    )
    res.raise_for_status()
    cards = []
    for c in res.json().get("data", []):
        attacks = "; ".join(
            f"{a.get('name')} ({''.join(a.get('cost', []))}): {a.get('damage') or ''} {a.get('text') or ''}".strip()
            for a in c.get("attacks", [])
        )
        abilities = "; ".join(
            f"{a.get('name')}: {a.get('text')}" for a in c.get("abilities", [])
        )
        cards.append(
            {
                "name": c.get("name"),
                "type_line": f"{c.get('supertype')} - {'/'.join(c.get('subtypes', []))}",
                "text": " | ".join(filter(None, [abilities, attacks])) or None,
                "cost": None,
                "rarity": c.get("rarity"),
                "set_name": (c.get("set") or {}).get("name"),
                "image_url": (c.get("images") or {}).get("small"),
            }
        )
    return cards


async def _fetch_yugioh(
    client: httpx.AsyncClient, query: str, limit: int, card_type: str, color: str, rarity: str
) -> list[dict]:
    res = await client.get(
        f"{settings.YGOPRODECK_API_URL}/cardinfo.php",
        params=build_ygo_params(query, limit, card_type, color),
    )
    if res.status_code == 400:  # YGOPRODeck returns 400 for "no results"
        return []
    res.raise_for_status()
    return [
        {
            "name": c.get("name"),
            "type_line": f"{c.get('type')} - {c.get('race') or ''}".strip(" -"),
            "text": c.get("desc"),
            "cost": f"ATK {c.get('atk')} / DEF {c.get('def')}" if c.get("atk") is not None else None,
            "rarity": None,
            "set_name": None,
            "image_url": ((c.get("card_images") or [{}])[0]).get("image_url_small"),
        }
        for c in res.json().get("data", [])[:limit]
    ]


async def _fetch_lorcana(
    client: httpx.AsyncClient, query: str, limit: int, card_type: str, color: str, rarity: str
) -> list[dict]:
    res = await client.get(
        f"{settings.LORCAST_API_URL}/cards/search",
        params={"q": build_lorcana_query(query, card_type, color, rarity)},
    )
    res.raise_for_status()
    return [
        {
            "name": f"{c.get('name')} - {c.get('version')}" if c.get("version") else c.get("name"),
            "type_line": "/".join(c.get("type", [])),
            "text": c.get("text"),
            "cost": str(c.get("cost")) if c.get("cost") is not None else None,
            "rarity": c.get("rarity"),
            "set_name": (c.get("set") or {}).get("name"),
            "image_url": ((c.get("image_uris") or {}).get("digital") or {}).get("normal"),
        }
        for c in res.json().get("results", [])[:limit]
    ]


_FETCHERS = {
    "magic": _fetch_magic,
    "pokemon": _fetch_pokemon,
    "yugioh": _fetch_yugioh,
    "lorcana": _fetch_lorcana,
}
