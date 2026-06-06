from pydantic import BaseModel
from typing import Optional

from app.schemas.trip_log import TripResponse
from app.schemas.vehicle import UserVehicleResponse

class DashboardStats(BaseModel): 
    total_trips: int
    total_distance: float
    total_fuel: float
    total_cost: float
    total_co2: float 
    recent_trips: list[TripResponse] = []
    default_vehicle: Optional[UserVehicleResponse] = None