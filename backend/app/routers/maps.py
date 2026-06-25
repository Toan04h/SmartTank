from fastapi import APIRouter, HTTPException, Depends, Request
from app.models.user import User
from app.services.maps_service import autocomplete_address, geocode_place, reverse_geocode
from app.core.dependencies import get_current_user
from app.core.limiter import limiter

router = APIRouter(
    prefix="/maps",
    tags=["maps"]
)

@router.get("/autocomplete")
@limiter.limit("30/minute")
async def autocomplete_address_endpoint(
    request: Request,
    input: str,
    lat: float | None = None,
    lng: float | None = None,
    user: User = Depends(get_current_user)
):
    try:
        return await autocomplete_address(input, lat, lng)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/geocode")
@limiter.limit("30/minute")
async def geocode_place_endpoint(
    request: Request,
    place_id: str,     
    user: User = Depends(get_current_user)
):
    try:
        return await geocode_place(place_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/reverse-geocode")
@limiter.limit("30/minute")
async def reverse_geocode_endpoint(
    request: Request,
    lat: float,
    lng: float,
    user: User = Depends(get_current_user)
):
    try:
        return await reverse_geocode(lat, lng)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))