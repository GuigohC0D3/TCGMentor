from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.services.cards import search_cards

router = APIRouter(prefix="/cards", tags=["cards"])


# No rate limit here: the debounced autocomplete fires on every typing pause
# and legitimate users hit per-minute caps fast. Results are Redis-cached and
# auth is still required, which keeps abuse traceable.
@router.get("/search", dependencies=[Depends(get_current_user)])
async def search(
    tcg: str = Query(pattern="^(pokemon|magic|yugioh|lorcana|onepiece)$"),
    q: str | None = Query(default=None, min_length=2, max_length=100),
    type: str | None = Query(default=None, max_length=50),
    color: str | None = Query(default=None, max_length=50),
    rarity: str | None = Query(default=None, max_length=50),
    limit: int = Query(default=20, ge=1, le=30),
) -> list[dict]:
    if not (q or type or color or rarity):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide a name (q) or at least one filter",
        )
    return await search_cards(
        tcg, q or "", limit, card_type=type, color=color, rarity=rarity
    )
