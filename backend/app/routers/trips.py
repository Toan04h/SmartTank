import logging
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.trip import TripCalculationRequest, TripCalculationResponse
from app.services.calculation_service import calculate_trip_cost
from app.services.fuel_service import get_fuel_price
from app.core.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/cost",
    tags=["cost"]
)

@router.post("/calculate", response_model=TripCalculationResponse, response_model_exclude_unset=True)
async def calculate_trip(
    request: TripCalculationRequest,
    current_user: User = Depends(get_current_user)
):
    """Calculates cost and CO2 for an arbitrary distance/MPG, without logging a trip.
    Uses the current fuel price unless one is supplied in the request."""
    try:
        fuel_type = request.fuel_type or "Regular Gasoline"
        if request.fuel_price is None: 
            price_data = await get_fuel_price(fuel_type)
            fuel_price = price_data["price"]
        else:
            fuel_price = request.fuel_price
            
        data = calculate_trip_cost(request.distance, request.mpg, fuel_price, fuel_type)
        data["distance"] = request.distance
        return data
    except Exception:
        logger.exception("Failed to calculate trip cost for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")
    
        