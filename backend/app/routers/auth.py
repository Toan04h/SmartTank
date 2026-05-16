from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session
from app.schemas.auth import UserRegister, UserLogin, TokenResponse
from app.services.auth_service import hash_password, verify_password, create_access_token
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
    existing_user = get_user_by_email(request.email, session)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(request.password)
    create_user(email=request.email, hashed_password=hashed, session=session)
    return {"message": "Account created successfully"}

@router.post("/login", response_model=TokenResponse)
async def user_login(
    request: UserLogin,
    session: Session = Depends(get_session)
):
    user = get_user_by_email(request.email, session)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or passowrd")
    
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, token_type="bearer")