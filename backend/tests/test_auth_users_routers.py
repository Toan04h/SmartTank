from sqlmodel import select
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.services.auth_service import hash_password, decode_access_token
from tests.conftest import make_user

# --- POST /auth/register ---

def test_register_success_persists_user_including_full_name(client, session):
    response = client.post("/auth/register", json={
        "email": "newuser@example.com",
        "password": "supersecret123",
        "full_name": "New User",
        "state": "CA",
        "zip_code": "90210",
    })

    assert response.status_code == 201
    assert response.json() == {"message": "Account created successfully"}

    stored = session.exec(select(User).where(User.email == "newuser@example.com")).first()
    assert stored is not None
    assert stored.full_name == "New User"
    assert stored.hashed_password != "supersecret123"

def test_register_duplicate_email_rejected(client):
    payload = {"email": "dupe@example.com", "password": "supersecret123"}
    first = client.post("/auth/register", json=payload)
    second = client.post("/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 400
    assert second.json()["detail"] == "Email already registered"

def test_register_password_too_short_is_rejected(client):
    response = client.post("/auth/register", json={
        "email": "shortpw@example.com",
        "password": "short1",
    })

    assert response.status_code == 422

def test_register_invalid_email_is_rejected(client):
    response = client.post("/auth/register", json={
        "email": "not-an-email",
        "password": "supersecret123",
    })

    assert response.status_code == 422

def test_register_rate_limited_after_10_per_minute(client):
    for i in range(10):
        client.post("/auth/register", json={
            "email": f"rate-limit-{i}@example.com",
            "password": "supersecret123",
        })

    response = client.post("/auth/register", json={
        "email": "rate-limit-overflow@example.com",
        "password": "supersecret123",
    })

    assert response.status_code == 429

# --- POST /auth/login ---

def test_login_success_returns_tokens_and_persists_refresh_token(client, session):
    make_user(session, email="login@example.com", hashed_password=hash_password("correct-password"))

    response = client.post("/auth/login", json={
        "email": "login@example.com",
        "password": "correct-password",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]

    stored_tokens = session.exec(select(RefreshToken)).all()
    assert len(stored_tokens) == 1
    assert stored_tokens[0].is_active is True

def test_login_wrong_password_rejected(client, session):
    make_user(session, email="login2@example.com", hashed_password=hash_password("correct-password"))

    response = client.post("/auth/login", json={
        "email": "login2@example.com",
        "password": "wrong-password",
    })

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_login_rate_limited_after_10_per_minute(client):
    for _ in range(10):
        client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"})

    response = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"})

    assert response.status_code == 429

def test_login_unknown_email_rejected(client):
    response = client.post("/auth/login", json={
        "email": "nobody@example.com",
        "password": "whatever123",
    })

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

# --- POST /auth/refresh ---

def test_refresh_with_valid_token_returns_new_access_token(client, session):
    user = make_user(session, email="refresh@example.com", hashed_password=hash_password("correct-password"))
    login_response = client.post("/auth/login", json={
        "email": "refresh@example.com",
        "password": "correct-password",
    })
    refresh_token = login_response.json()["refresh_token"]

    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == 200
    new_access_token = response.json()["access_token"]
    payload = decode_access_token(new_access_token)
    assert payload["sub"] == str(user.id)

def test_refresh_with_unknown_token_rejected(client):
    response = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})

    assert response.status_code == 401

# --- POST /auth/logout ---

def test_logout_revokes_refresh_token(client, session):
    make_user(session, email="logout@example.com", hashed_password=hash_password("correct-password"))
    login_response = client.post("/auth/login", json={
        "email": "logout@example.com",
        "password": "correct-password",
    })
    refresh_token = login_response.json()["refresh_token"]

    logout_response = client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert logout_response.status_code == 200
    assert logout_response.json() == {"message": "Logged out successfully"}

    reuse_response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse_response.status_code == 401

def test_logout_with_unknown_token_returns_404(client):
    response = client.post("/auth/logout", json={"refresh_token": "not-a-real-token"})

    assert response.status_code == 404

# --- GET/PATCH /users/profile ---

def test_get_profile_returns_current_user(client, test_user):
    response = client.get("/users/profile")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(test_user.id)
    assert body["email"] == test_user.email

def test_patch_profile_partial_update_preserves_other_fields(client, test_user):
    response = client.patch("/users/profile", json={"full_name": "Updated Name"})

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Updated Name"
    assert body["state"] == test_user.state
    assert body["zip_code"] == test_user.zip_code

def test_patch_profile_invalid_state_length_rejected(client):
    response = client.patch("/users/profile", json={"state": "California"})

    assert response.status_code == 422

# --- PATCH /users/password ---

def test_change_password_success_and_old_password_stops_working(client, session, test_user):
    test_user.hashed_password = hash_password("OldPass123")
    session.add(test_user)
    session.commit()

    response = client.patch("/users/password", json={
        "old_password": "OldPass123",
        "new_password": "NewPass456",
    })

    assert response.status_code == 200
    session.refresh(test_user)
    assert test_user.hashed_password != hash_password("OldPass123")

def test_change_password_wrong_old_password_rejected(client, session, test_user):
    test_user.hashed_password = hash_password("OldPass123")
    session.add(test_user)
    session.commit()

    response = client.patch("/users/password", json={
        "old_password": "totally-wrong",
        "new_password": "NewPass456",
    })

    assert response.status_code == 401

def test_change_password_too_short_rejected(client):
    response = client.patch("/users/password", json={
        "old_password": "whatever",
        "new_password": "short1",
    })

    assert response.status_code == 422

# --- GET /users/dashboard ---

def test_dashboard_empty_state_for_new_user(client):
    response = client.get("/users/dashboard")

    assert response.status_code == 200
    body = response.json()
    assert body["total_trips"] == 0
    assert body["recent_trips"] == []
    assert body["default_vehicle"] is None
