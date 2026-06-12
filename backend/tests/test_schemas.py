import pytest
from pydantic import ValidationError

from app.schemas.chat import ChatRequest
from app.schemas.deck import DeckCard, DeckCreate
from app.schemas.user import UserUpdate


def test_chat_request_empty_message_rejected():
    with pytest.raises(ValidationError):
        ChatRequest(message="   ")


def test_chat_request_invalid_tcg_rejected():
    with pytest.raises(ValidationError):
        ChatRequest(message="hi", tcg_context="hearthstone")


def test_chat_request_empty_conversation_id_coerced():
    req = ChatRequest(message="hi", conversation_id="")
    assert req.conversation_id is None


def test_deck_create_valid():
    deck = DeckCreate(name=" Burn ", tcg="magic", cards=[DeckCard(name="Bolt", quantity=4)])
    assert deck.name == "Burn"
    assert deck.cards[0].quantity == 4


def test_deck_create_invalid_tcg():
    with pytest.raises(ValidationError):
        DeckCreate(name="X", tcg="uno")


def test_deck_card_quantity_bounds():
    with pytest.raises(ValidationError):
        DeckCard(name="Bolt", quantity=0)
    with pytest.raises(ValidationError):
        DeckCard(name="Bolt", quantity=100)


def test_user_update_validates_skill_level():
    assert UserUpdate(skill_level="beginner").skill_level == "beginner"
    with pytest.raises(ValidationError):
        UserUpdate(skill_level="expert")


def test_user_update_validates_preferred_tcg():
    with pytest.raises(ValidationError):
        UserUpdate(preferred_tcg="hearthstone")
