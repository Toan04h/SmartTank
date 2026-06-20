from fastapi import HTTPException, APIRouter, Depends
from sqlmodel import Session
from app.models.user import User
from app.schemas.auth import UserResponse, UserProfileUpdate, PasswordChangeRequest
from app.schemas.dashboard import DashboardStats
from app.services.user_service import update_user_profile, change_password
from app.services.dashboard_service import build_dashboard
from app.core.dependencies import get_current_user
from app.core.database import get_session

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        return await build_dashboard(user, session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@router.patch("/password", response_model=UserResponse)
async def change_user_password(
    request: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        return change_password(request, user, session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))