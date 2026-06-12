from app.services.ai.prompt_builder import (
    SKILL_LEVEL_ADDENDUM,
    TCG_CONTEXTS,
    build_history_messages,
    build_system_prompt,
)


def test_general_prompt_without_context():
    prompt = build_system_prompt(None)
    assert "General TCG Learning" in prompt


def test_game_specific_prompt():
    for tcg, game_name in TCG_CONTEXTS.items():
        prompt = build_system_prompt(tcg)
        assert game_name in prompt


def test_unknown_context_falls_back_to_general():
    prompt = build_system_prompt("notagame")
    assert "General TCG Learning" in prompt


def test_skill_level_addendum_appended():
    for level in SKILL_LEVEL_ADDENDUM:
        prompt = build_system_prompt("magic", skill_level=level)
        assert f"User Skill Level: {level.capitalize()}" in prompt


def test_invalid_skill_level_ignored():
    assert build_system_prompt("magic", skill_level="wizard") == build_system_prompt("magic")


def test_history_truncated_to_max():
    messages = [{"role": "user", "content": str(i)} for i in range(50)]
    result = build_history_messages(messages, max_messages=20)
    assert len(result) == 20
    assert result[-1]["content"] == "49"


def test_history_strips_extra_keys():
    messages = [{"role": "user", "content": "hi", "meta": {"x": 1}}]
    assert build_history_messages(messages) == [{"role": "user", "content": "hi"}]
