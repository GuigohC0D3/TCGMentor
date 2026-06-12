import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import DB, CurrentUser, rate_limit_user
from app.core.config import settings
from app.core.rate_limit import check_daily_quota
from app.repositories.deck_repository import DeckRepository
from app.schemas.deck import DeckCreate, DeckResponse, DeckSummary, DeckUpdate
from app.services.ai.deck_analyzer import analyze_deck

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/decks", tags=["decks"])


def _to_response(deck) -> DeckResponse:
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        tcg=deck.tcg,
        cards=deck.cards or [],
        analysis=deck.analysis,
        analyzed_at=deck.analyzed_at,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
    )


# Paths use "" (not "/") so /api/v1/decks resolves without a trailing-slash
# redirect — FastAPI's 307 would expose the internal Docker hostname to the browser
@router.post("", response_model=DeckResponse, status_code=status.HTTP_201_CREATED)
async def create_deck(payload: DeckCreate, current_user: CurrentUser, db: DB) -> DeckResponse:
    repo = DeckRepository(db)
    deck = await repo.create(
        current_user.id, payload.name, payload.tcg, [c.model_dump() for c in payload.cards]
    )
    return _to_response(deck)


@router.get("", response_model=list[DeckSummary])
async def list_decks(current_user: CurrentUser, db: DB) -> list[DeckSummary]:
    repo = DeckRepository(db)
    decks = await repo.list_by_user(current_user.id)
    return [
        DeckSummary(
            id=d.id,
            name=d.name,
            tcg=d.tcg,
            card_count=sum(c.get("quantity", 0) for c in (d.cards or [])),
            tier=(d.analysis or {}).get("tier"),
            created_at=d.created_at,
        )
        for d in decks
    ]


@router.get("/{deck_id}", response_model=DeckResponse)
async def get_deck(deck_id: uuid.UUID, current_user: CurrentUser, db: DB) -> DeckResponse:
    deck = await DeckRepository(db).get_by_id(deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return _to_response(deck)


@router.put("/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: uuid.UUID, payload: DeckUpdate, current_user: CurrentUser, db: DB
) -> DeckResponse:
    repo = DeckRepository(db)
    deck = await repo.get_by_id(deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    cards = [c.model_dump() for c in payload.cards] if payload.cards is not None else None
    deck = await repo.update(deck, payload.name, cards)
    return _to_response(deck)


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(deck_id: uuid.UUID, current_user: CurrentUser, db: DB) -> None:
    deleted = await DeckRepository(db).delete(deck_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")


@router.post(
    "/{deck_id}/analyze",
    response_model=DeckResponse,
    dependencies=[Depends(rate_limit_user("deck_analyze", times=5))],
)
async def analyze(deck_id: uuid.UUID, current_user: CurrentUser, db: DB) -> DeckResponse:
    repo = DeckRepository(db)
    deck = await repo.get_by_id(deck_id, current_user.id)
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    if not deck.cards:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Add cards to the deck before analyzing"
        )

    if not current_user.is_premium:
        today = datetime.now(timezone.utc).strftime("%Y%m%d")
        await check_daily_quota(
            f"quota:deck_analyze:{current_user.id}:{today}",
            settings.FREE_DAILY_DECK_ANALYSES,
            detail="Daily free deck analysis limit reached. Upgrade to premium for unlimited analyses.",
        )

    try:
        analysis = await analyze_deck(deck.name, deck.tcg, deck.cards)
    except Exception as exc:
        logger.error("Deck analysis failed for %s: %s", deck_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Deck analysis is temporarily unavailable, please try again",
        )

    await repo.save_analysis(deck.id, analysis)
    deck.analysis = analysis
    deck.analyzed_at = datetime.now(timezone.utc)
    return _to_response(deck)
