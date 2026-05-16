from fastapi import APIRouter, HTTPException
from app.schemas.auth import UserRegister, UserLogin, TokenResponse
from app.services.auth_service import hash_password, verify_password, create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/register")
async def user_register(request: UserRegister):
    hashed_password = hash_password(request.password)
    # TODO: save user to database once User model is ready
    # user = create_user(email=request.email, hashed_password=hashed_password)
    return {"message": "Account created successfully"}

@router.post("/login", response_model=TokenResponse)
async def user_login(request: UserLogin):
    # TODO: fetch user from database once User model is ready
    # user = get_user_by_email(request.email)
    # if not user:
    #     raise HTTPException(status_code=401, detail="Invalid email or password")
    user = {"id": "...", "hashed_password": "..."}
    if not verify_password(request.password, "user.hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(user)
    return TokenResponse(access_token=token, token_type="bearer")