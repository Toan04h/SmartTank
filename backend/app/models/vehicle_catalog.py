import uuid 
from sqlmodel import SQLModel, Field, Column, String
from typing import Optional

class VehicleCatalog(SQLModel, table=True):
    __tablename__ = "vehicle_catalog" # type: ignore
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    epa_vehicle_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String, unique=True, index=True)
    )
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
    # Electric/alternative fuel data
    fuel_type_2: Optional[str] = None 
    city_mpg_alt: Optional[float] = None
    highway_mpg_alt: Optional[float] = None
    combined_mpg_alt: Optional[float] = None
    
    