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
    """Returns the current calendar month's trip stats and the user's 5 most recent trips."""
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
    """Returns the authenticated user's profile."""
    return user

@router.patch("/profile", response_model=UserResponse)
def update_current_user_profile(
    request: UserProfileUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> User:
    """Partially updates the authenticated user's profile. Omitted fields are left unchanged."""
    return update_user_profile(user.id, request, session)

@router.patch("/password", response_model=UserResponse)
async def change_user_password(
    request: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Changes the authenticated user's password after verifying the old one."""
    try:
        return change_password(request, user, session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))