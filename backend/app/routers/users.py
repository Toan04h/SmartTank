from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.models.user import User
from app.schemas.auth import UserResponse, UserProfileUpdate
from app.services.user_service import update_user_profile
from app.core.dependencies import get_current_user
from app.core.database import get_session

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.get("/profile", response_model=UserResponse)
def current_user_profile(
    user: User = Depends(get_current_user),
) -> User:
    return user 

@router.patch("/profile", response_model=UserResponse)
def update_current_user_profile(
    request: UserProfileUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> User:
    return update_user_profile(user.id, request, session)