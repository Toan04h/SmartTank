from pydantic import BaseModel
from typing import Optional

class TripCalculationRequest(BaseModel):
    distance: float 
    mpg: float
    fuel_price: Optional[float] = None
    
class TripCalculationResponse(BaseModel):
    distance: float
    gallons_used: float
    trip_cost: float
    co2_kg: float