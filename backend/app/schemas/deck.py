import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

VALID_TCGS = {"pokemon", "magic", "yugioh", "lorcana", "onepiece"}


class DeckCard(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    quantity: int = Field(ge=1, le=99)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Card name cannot be empty")
        return v


class DeckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    tcg: str
    cards: list[DeckCard] = Field(default_factory=list, max_length=150)

    @field_validator("name")
    @classmethod
    def strip_deck_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Deck name cannot be empty")
        return v

    @field_validator("tcg")
    @classmethod
    def valid_tcg(cls, v: str) -> str:
        if v not in VALID_TCGS:
            raise ValueError(f"Invalid tcg: {v}")
        return v


class DeckUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    cards: list[DeckCard] | None = Field(default=None, max_length=150)


class ComboEntry(BaseModel):
    cards: list[str]
    description: str


class MatchupEntry(BaseModel):
    deck: str
    reason: str


class DeckAnalysis(BaseModel):
    tier: str
    archetype: str
    summary: str
    tips: list[str]
    combos: list[ComboEntry]
    strong_against: list[MatchupEntry]
    weak_against: list[MatchupEntry]
    improvements: list[str]


class DeckResponse(BaseModel):
    id: uuid.UUID
    name: str
    tcg: str
    cards: list[DeckCard]
    analysis: DeckAnalysis | None
    analyzed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeckSummary(BaseModel):
    id: uuid.UUID
    name: str
    tcg: str
    card_count: int
    tier: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
