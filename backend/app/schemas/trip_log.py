import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional

class TripCreate(BaseModel):
    start_lat: Optional[float] = None
    end_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_lng: Optional[float] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None 
    start_location: Optional[str] = None
    end_location: Optional[str] = None
    distance: Optional[float] = Field(default=None, gt=0, description="Distance in miles")
    vehicle_id: uuid.UUID
    route_image_key: Optional[str] = None
    trip_date: Optional[datetime] = None
    tag: Optional[str] = None
    notes: Optional[str] = None
    
    @model_validator(mode="after")
    def validate_trip_mode(self) -> "TripCreate":
        has_gps = all([self.start_lat, self.start_lng, self.end_lat, self.end_lng])
        has_manual = self.distance is not None
        if not has_gps and not has_manual:
            raise ValueError(
                "A trip must include either GPS coordinates or a manual distance"
            )
        return self   
    
class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    user_id: uuid.UUID
    vehicle_id: uuid.UUID
    start_lat: Optional[float] = None
    end_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_lng: Optional[float] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None 
    start_location: Optional[str] = None
    end_location: Optional[str] = None
    distance: float
    gallons_used: float
    fuel_price: float
    trip_cost: float
    co2_kg: float
    route_image_key: Optional[str] = None
    trip_date: Optional[datetime] = None
    tag: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class TripImageUpdate(BaseModel):
    object_key: str