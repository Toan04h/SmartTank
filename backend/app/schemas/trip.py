from pydantic import BaseModel, Field
from typing import Optional

class TripCalculationRequest(BaseModel):
    distance: float = Field(gt=0, description="Distance in miles")
    mpg: float = Field(gt=0, description="Miles per gallon")
    fuel_type: Optional[str] = None
    fuel_price: Optional[float] = Field(default=None, gt=0, description="Price per gallon")
    
class TripCalculationResponse(BaseModel):
    distance: float 
    gallons_used: float 
    trip_cost: float
    co2_kg: float