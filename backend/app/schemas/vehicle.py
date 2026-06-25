import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class VehicleStats(BaseModel):
    total_trips: int
    total_distance: float
    total_fuel: float
    total_cost: float
    total_co2: float

class AddVehicleRequest(BaseModel):
    catalog_id: uuid.UUID
    # Garage specific
    nickname: Optional[str] = None
    mpg_override: Optional[float] = None
    is_default: bool = False
    
class VehicleSearchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    epa_vehicle_id: str
    description: Optional[str] = None
    make: str
    model: str
    year: int
    drive: Optional[str] = None
    cylinders: Optional[int] = None
    displacement: Optional[float] = None
    vehicle_class: Optional[str] = None
    atv_type: Optional[str] = None
    fuel_type: Optional[str] = None 
    city_mpg: Optional[float] = None
    highway_mpg: Optional[float] = None
    combined_mpg: Optional[float] = None
    # Electric/alternative fuel support
    fuel_type_2: Optional[str] = None 
    city_mpg_alt: Optional[float] = None
    highway_mpg_alt: Optional[float] = None
    combined_mpg_alt: Optional[float] = None
    
class VehicleSearchRequest(BaseModel):
    make: str
    model: str
    year: int
    
class UserVehicleCreate(BaseModel):
    catalog_id: uuid.UUID
    nickname: Optional[str] = None
    make: str
    model: str
    year: int
    mpg_override: Optional[float] = None
    is_default: bool = False

class UserVehicleUpdate(BaseModel):
    nickname: Optional[str] = None
    mpg_override: Optional[float] = None

class UserVehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
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