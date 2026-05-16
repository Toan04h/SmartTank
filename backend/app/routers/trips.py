from fastapi import APIRouter, HTTPException, Depends
from app.schemas.trip import TripCalculationRequest, TripCalculationResponse
from app.services.calculation_service import calculate_trip_cost
from app.services.fuel_service import get_national_fuel_price
from app.core.dependencies import get_current_user
from app.models.user import User 

router = APIRouter(
    prefix="/cost",
    tags=["cost"]
)

@router.post("/calculate", response_model=TripCalculationResponse, response_model_exclude_unset=True)
async def calculate_trip(
    request: TripCalculationRequest, 
    current_user: User = Depends(get_current_user)
):
    try:
        if request.fuel_price is None: 
            price_data = await get_national_fuel_price()
            fuel_price = price_data["price_per_gallon"]
        else:
            fuel_price = request.fuel_price
            
        data = calculate_trip_cost(request.distance, request.mpg, fuel_price)
        data["distance"] = request.distance
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
        