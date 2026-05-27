from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.schemas.trip_log import TripCreate, TripResponse
from app.services.trip_service import create_trip
from app.core.dependencies import get_current_user
from app.models.user import User 
from app.models.trip import Trip
from app.core.database import get_session

router = APIRouter(
    prefix="/trips",
    tags=["trips"]
)
        
@router.post("", response_model=TripResponse, status_code=201)
async def log_trip(
    trip_data: TripCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    try:
        result = await create_trip(
            trip_data, 
            current_user.id, 
            current_user.state, 
            session
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("", response_model=list[TripResponse])
async def get_trips(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    trips = session.exec(
        select(Trip).where(
            Trip.user_id == current_user.id
            )
        ).all()
    
    return trips
        