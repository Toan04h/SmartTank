from fastapi import APIRouter, HTTPException, Depends, Request
from sqlmodel import Session
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, AccessTokenResponse, RefreshRequest
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.services.refresh_token_service import create_refresh_token, verify_refresh_token, revoke_refresh_token
from app.services.user_service import get_user_by_email, create_user
from app.core.database import get_session
from app.core.limiter import limiter

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/register", status_code=201)
@limiter.limit("10/minute")
async def user_register(
    request: Request,
    payload: UserRegister,
    session: Session = Depends(get_session)
):
    """Registers a new user account. Fails with 400 if the email is already taken."""
    existing_user = get_user_by_email(payload.email, session)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(payload.password)
    create_user(
        email=payload.email,
        hashed_password=hashed,
        full_name=payload.full_name,
        state=payload.state,
        zip_code=payload.zip_code,
        session=session)
    return {"message": "Account created successfully"}

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def user_login(
    request: Request,
    payload: UserLogin,
    session: Session = Depends(get_session)
):
    """Authenticates a user and issues a new access token + refresh token pair."""
    user = get_user_by_email(payload.email, session)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = await create_refresh_token(user.id, session)
    return TokenResponse(refresh_token=refresh_token, access_token=access_token, token_type="bearer")

@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_access_token(
    request: RefreshRequest,
    session: Session = Depends(get_session)
):
    """Exchanges a valid, unexpired refresh token for a new access token."""
    user_id = verify_refresh_token(request.refresh_token, session)
    access_token = create_access_token({"sub": str(user_id)})
    return AccessTokenResponse(access_token=access_token)

@router.post("/logout")
async def logout(
    request: RefreshRequest,
    session: Session = Depends(get_session)
):
    """Revokes a refresh token, ending the session it belongs to."""
    await revoke_refresh_token(request.refresh_token, session)
    return {"message": "Logged out successfully"}