import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class VehicleSearchRequest(BaseModel):
    make: str
    model: str
    year: int
    
class VehicleSearchResponse(BaseModel):
    id: uuid.UUID
    make: str
    model: str
    year: int
    fuel_type: Optional[str] = None 
    city_mpg: Optional[float] = None
    highway_mpg: Optional[float] = None
    combined_mpg: Optional[float] = None
    nhtsa_vehicle_id: Optional[str] = None
    
class UserVehicleCreate(BaseModel):
    catalog_id: uuid.UUID
    nickname: Optional[str] = None
    make: str
    model: str
    year: int
    mpg_override: Optional[float] = None
    is_default: bool = False

class UserVehicleResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    catalog_id: Optional[uuid.UUID] = None
    nickname: Optional[str] = None
    make: str
    model: str
    year: int
    mpg_override: Optional[float] = None
    is_default: bool
    created_at: datetime   