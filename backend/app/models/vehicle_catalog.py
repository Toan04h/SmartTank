import uuid 
from sqlmodel import SQLModel, Field
from typing import Optional

class VehicleCatalog(SQLModel, table=True):
    __tablename__ = "vehicle_catalog" # type: ignore
    
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    make: str 
    model: str
    year: int 
    fuel_type: str
    city_mpg: Optional[float] = None
    highway_mpg: Optional[float] = None
    combined_mpg: Optional[float] = None
    nhtsa_vehicle_id: Optional[str] = None
    