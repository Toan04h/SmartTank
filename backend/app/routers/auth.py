from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, AccessTokenResponse, RefreshRequest
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.services.refresh_token_service import create_refresh_token, verify_refresh_token, revoke_refresh_token
from app.services.user_service import get_user_by_email, create_user
from app.core.database import get_session

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/register", status_code=201)
async def user_register(
    request: UserRegister,
    session: Session = Depends(get_session)
):
    """Registers a new user account. Fails with 400 if the email is already taken."""
    existing_user = get_user_by_email(request.email, session)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(request.password)
    create_user(
        email=request.email,
        hashed_password=hashed,
        full_name=request.full_name,
        state=request.state,
        zip_code=request.zip_code,
        session=session)
    return {"message": "Account created successfully"}

@router.post("/login", response_model=TokenResponse)
async def user_login(
    request: UserLogin,
    session: Session = Depends(get_session)
):
    """Authenticates a user and issues a new access token + refresh token pair."""
    user = get_user_by_email(request.email, session)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, user.hashed_password):
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