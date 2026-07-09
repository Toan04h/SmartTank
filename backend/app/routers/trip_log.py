import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.schemas.trip_log import TripCreate, TripResponse, TripImageUpdate
from app.services.trip_service import create_trip
from app.services.storage_service import generate_upload_url, generate_download_url
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

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip_detail(
    trip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return get_user_trip(trip_id, user.id, session)

@router.post("/{trip_id}/image-upload-url")
async def get_image_upload_url(
    trip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    get_user_trip(trip_id, user.id, session)
        
    return generate_upload_url(trip_id)

@router.get("/{trip_id}/image")
async def get_image_url(
    trip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    trip = get_user_trip(trip_id, user.id, session)
    
    if trip.route_image_key is None: 
        raise HTTPException(
            status_code=404,
            detail="No image for this trip"
        )
        
    return {"image_url": generate_download_url(trip.route_image_key)}

@router.patch("/{trip_id}/image", response_model=TripResponse)
async def save_image_key(
    trip_id: uuid.UUID,
    request: TripImageUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    trip = get_user_trip(trip_id, user.id, session)
    
    trip.route_image_key = request.object_key
    session.add(trip)
    session.commit()
    session.refresh(trip)
    
    return trip 
   
def get_user_trip(trip_id, user_id, session) -> Trip:
    trip = session.exec(
        select(Trip).where(
            Trip.id == trip_id,
            Trip.user_id == user_id,
        )
    ).first()
    
    if not trip:
        raise HTTPException(
            status_code=404, 
            detail="Trip not found"
        )
    
    return trip