import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class TripCreate(BaseModel):
    start_location: str
    end_location: str
    distance: float = Field(gt=0, description="Distance in miles")
    vehicle_id: uuid.UUID
    trip_date: Optional[datetime] = None
    tag: Optional[str] = None
    notes: Optional[str] = None
    
class TripResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    vehicle_id: uuid.UUID
    start_location: str
    end_location: str
    distance: float
    gallons_used: float
    fuel_price: float
    trip_cost: float
    co2_kg: float
    trip_date: Optional[datetime] = None
    tag: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
