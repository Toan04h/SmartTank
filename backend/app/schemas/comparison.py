import uuid
from pydantic import BaseModel, Field
from typing import Optional

class CompareRequest(BaseModel):
    vehicle_list: list[uuid.UUID] = Field(min_length=1, max_length=4)
    
class VehicleComparisonResult(BaseModel):
    # Trip-based comparison results
    total_trips: int
    total_distance: Optional[float] = None
    total_cost: Optional[float] = None
    total_gallons: Optional[float] = None
    total_co2_kg: Optional[float] = None
    estimated_savings: Optional[float] = None
    is_baseline: bool
    # Vehicle-based comparison results
    catalog_id: Optional[uuid.UUID] = None
    make: str
    model: str
    year: int
    description: Optional[str] = None
    drive: Optional[str] = None
    cylinders: Optional[int] = None
    displacement: Optional[float] = None
    vehicle_class: Optional[str] = None
    atv_type: Optional[str] = None
    fuel_type: Optional[str] = None
    city_mpg: Optional[float] = None
    highway_mpg: Optional[float] = None
    combined_mpg: Optional[float] = None
    # Alternative fuel type
    fuel_type_2: Optional[str] = None
    city_mpg_alt: Optional[float] = None
    highway_mpg_alt: Optional[float] = None
    combined_mpg_alt: Optional[float] = None
    
    