from app.services.cards.lookup import (
    build_lorcana_query,
    build_pokemon_query,
    build_scryfall_query,
    build_ygo_params,
)


def test_scryfall_name_only():
    assert build_scryfall_query("bolt", "", "", "") == "bolt"


def test_scryfall_full_filters():
    q = build_scryfall_query("dragon", "Creature", "R", "mythic")
    assert q == "dragon t:creature c:r r:mythic"


def test_scryfall_filters_without_name():
    assert build_scryfall_query("", "Instant", "U", "") == "t:instant c:u"


def test_pokemon_single_word_contains_match():
    assert build_pokemon_query("zard", "", "", "") == "name:*zard*"


def test_pokemon_multi_word_per_word_contains():
    assert build_pokemon_query("charizard ex", "", "", "") == "name:*charizard* name:*ex*"


def test_pokemon_apostrophe_becomes_wildcard():
    assert build_pokemon_query("farfetch'd", "", "", "") == "name:*farfetch*d*"


def test_pokemon_full_filters():
    q = build_pokemon_query("char", "Pokémon", "Fire", "Rare Holo")
    assert q == 'name:*char* supertype:"Pokémon" types:"Fire" rarity:"Rare Holo"'


def test_ygo_params_full():
    params = build_ygo_params("dark", 10, "Effect Monster", "DARK")
    assert params == {
        "num": 10,
        "offset": 0,
        "fname": "dark",
        "type": "Effect Monster",
        "attribute": "DARK",
    }


def test_ygo_params_filters_only():
    params = build_ygo_params("", 5, "Spell Card", "")
    assert "fname" not in params
    assert params["type"] == "Spell Card"


def test_lorcana_rarity_spaces_underscored():
    q = build_lorcana_query("elsa", "Character", "Ruby", "Super Rare")
    assert q == "elsa type:character ink:ruby rarity:super_rare"
