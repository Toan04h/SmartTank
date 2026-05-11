from fastapi import APIRouter, HTTPException
from app.schemas.trip import TripCalculationRequest, TripCalculationResponse
from app.services.calculation_service import calculate_trip_cost
from app.services.fuel_service import get_national_fuel_price

router = APIRouter(
    prefix="/cost",
    tags=["cost"]
)

@router.post("/calculate", response_model=TripCalculationResponse, response_model_exclude_unset=True)
async def calculate_trip(request: TripCalculationRequest):
    if request.fuel_price is None:
        try:
            data = await get_national_fuel_price()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        fuel_price = data["price_per_gallon"]
    else:
        fuel_price = request.fuel_price
        
    distance = request.distance
    mpg = request.mpg
    
    data = calculate_trip_cost(distance, mpg, fuel_price)
    data["distance"] = request.distance
    return data
    
        