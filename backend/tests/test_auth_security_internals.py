import time
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi import HTTPException
from jose import jwt
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.refresh_token import RefreshToken
from app.services.auth_service import (
    hash_password,
    verify_password,
    generate_refresh_token,
    hash_refresh_token,
    create_access_token,
    decode_access_token,
)
from app.services.refresh_token_service import (
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
)
from tests.conftest import make_user

# --- password hashing ---

def test_hash_and_verify_password_round_trip():
    hashed = hash_password("correct-horse-battery-staple")

    assert hashed != "correct-horse-battery-staple"
    assert verify_password("correct-horse-battery-staple", hashed) is True

def test_verify_password_rejects_wrong_password():
    hashed = hash_password("correct-horse-battery-staple")

    assert verify_password("wrong-password", hashed) is False

# --- refresh token primitives ---

def test_generate_refresh_token_produces_unique_values():
    assert generate_refresh_token() != generate_refresh_token()

def test_hash_refresh_token_is_deterministic():
    token = generate_refresh_token()

    assert hash_refresh_token(token) == hash_refresh_token(token)

def test_hash_refresh_token_differs_for_different_inputs():
    assert hash_refresh_token("token-a") != hash_refresh_token("token-b")

# --- access token create/decode ---

def test_create_and_decode_access_token_round_trip():
    user_id = str(uuid.uuid4())
    token = create_access_token({"sub": user_id})

    payload = decode_access_token(token)

    assert payload["sub"] == user_id

def test_decode_tampered_token_raises_401():
    token = create_access_token({"sub": str(uuid.uuid4())})
    tampered = token[:-1] + ("A" if token[-1] != "A" else "B")

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(tampered)
    assert exc_info.value.status_code == 401

def test_decode_expired_token_raises_401():
    expired_payload = {
        "sub": str(uuid.uuid4()),
        "exp": int(time.time()) - 60,
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(expired_token)
    assert exc_info.value.status_code == 401

def test_decode_token_signed_with_wrong_secret_raises_401():
    token = jwt.encode({"sub": str(uuid.uuid4())}, "a-different-secret", algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(token)
    assert exc_info.value.status_code == 401

# --- refresh token service (DB-backed) ---

@pytest.mark.anyio
async def test_create_and_verify_refresh_token_round_trip(session):
    user = make_user(session)

    token = await create_refresh_token(user.id, session)

    assert verify_refresh_token(token, session) == user.id

def test_verify_unknown_refresh_token_raises_401(session):
    with pytest.raises(HTTPException) as exc_info:
        verify_refresh_token("this-token-does-not-exist", session)
    assert exc_info.value.status_code == 401

def test_verify_expired_refresh_token_raises_401(session):
    user = make_user(session)
    raw_token = generate_refresh_token()
    session.add(RefreshToken(
        token=hash_refresh_token(raw_token),
        user_id=user.id,
        expires_at=datetime.utcnow() - timedelta(days=1),
        is_active=True,
    ))
    session.commit()

    with pytest.raises(HTTPException) as exc_info:
        verify_refresh_token(raw_token, session)
    assert exc_info.value.status_code == 401

@pytest.mark.anyio
async def test_revoke_then_verify_fails(session):
    user = make_user(session)
    token = await create_refresh_token(user.id, session)

    await revoke_refresh_token(token, session)

    with pytest.raises(HTTPException) as exc_info:
        verify_refresh_token(token, session)
    assert exc_info.value.status_code == 401

@pytest.mark.anyio
async def test_revoke_unknown_refresh_token_raises_404(session):
    with pytest.raises(HTTPException) as exc_info:
        await revoke_refresh_token("this-token-does-not-exist", session)
    assert exc_info.value.status_code == 404

@pytest.mark.anyio
async def test_revoke_already_revoked_token_raises_404(session):
    user = make_user(session)
    token = await create_refresh_token(user.id, session)
    await revoke_refresh_token(token, session)

    with pytest.raises(HTTPException) as exc_info:
        await revoke_refresh_token(token, session)
    assert exc_info.value.status_code == 404

# --- get_current_user dependency ---
# get_current_user opens its own Session against app.core.dependencies.engine
# rather than going through the get_session dependency, so it's tested here by
# monkeypatching that module-level engine to the in-memory test database.

@pytest.mark.anyio
async def test_get_current_user_valid_token_returns_user(session, monkeypatch):
    monkeypatch.setattr("app.core.dependencies.engine", session.get_bind())
    user = make_user(session)
    token = create_access_token({"sub": str(user.id)})

    result = await get_current_user(token=token)

    assert result.id == user.id
    assert result.email == user.email

@pytest.mark.anyio
async def test_get_current_user_missing_user_raises_401(session, monkeypatch):
    monkeypatch.setattr("app.core.dependencies.engine", session.get_bind())
    token = create_access_token({"sub": str(uuid.uuid4())})

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token=token)
    assert exc_info.value.status_code == 401

@pytest.mark.anyio
async def test_get_current_user_garbage_token_raises_401(session, monkeypatch):
    monkeypatch.setattr("app.core.dependencies.engine", session.get_bind())

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token="not-a-real-jwt")
    assert exc_info.value.status_code == 401
