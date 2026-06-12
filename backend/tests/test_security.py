from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = hash_password("s3cret-password")
    assert hashed != "s3cret-password"
    assert verify_password("s3cret-password", hashed)
    assert not verify_password("wrong-password", hashed)


def test_jwt_roundtrip():
    token = create_access_token("user-123")
    assert decode_access_token(token) == "user-123"


def test_jwt_tampered_token_rejected():
    token = create_access_token("user-123")
    assert decode_access_token(token + "x") is None


def test_jwt_garbage_rejected():
    assert decode_access_token("not-a-token") is None
