import json

import pytest

from app.services.ai.deck_analyzer import _format_deck, parse_analysis

VALID = {
    "tier": "A",
    "archetype": "Aggro Burn",
    "summary": "Fast and consistent.",
    "tips": ["Mulligan aggressively"],
    "combos": [{"cards": ["Card A", "Card B"], "description": "A enables B"}],
    "strong_against": [{"deck": "Control", "reason": "Too slow to stabilize"}],
    "weak_against": [{"deck": "Lifegain", "reason": "Outpaces your damage"}],
    "improvements": ["Add more card draw"],
}


def test_parse_clean_json():
    result = parse_analysis(json.dumps(VALID))
    assert result["tier"] == "A"
    assert result["combos"][0]["cards"] == ["Card A", "Card B"]


def test_parse_with_markdown_fences():
    raw = f"```json\n{json.dumps(VALID)}\n```"
    assert parse_analysis(raw)["tier"] == "A"


def test_parse_with_surrounding_text():
    raw = f"Here is my analysis:\n{json.dumps(VALID)}\nHope this helps!"
    assert parse_analysis(raw)["archetype"] == "Aggro Burn"


def test_invalid_tier_clamped_to_c():
    data = {**VALID, "tier": "SSS"}
    assert parse_analysis(json.dumps(data))["tier"] == "C"


def test_lowercase_tier_normalized():
    data = {**VALID, "tier": "s"}
    assert parse_analysis(json.dumps(data))["tier"] == "S"


def test_missing_lists_default_empty():
    data = {"tier": "B", "archetype": "X", "summary": "y"}
    result = parse_analysis(json.dumps(data))
    assert result["tips"] == []
    assert result["combos"] == []
    assert result["strong_against"] == []


def test_no_json_raises():
    with pytest.raises(ValueError):
        parse_analysis("I cannot analyze this deck.")


def test_format_deck_includes_cards_and_data():
    text = _format_deck(
        "My Deck",
        [{"name": "Lightning Bolt", "quantity": 4}],
        [{"name": "Lightning Bolt", "type_line": "Instant", "text": "Deal 3 damage."}],
    )
    assert "4x Lightning Bolt" in text
    assert "Deal 3 damage." in text
