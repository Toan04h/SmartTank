import uuid 
from datetime import datetime
from sqlmodel import SQLModel, Field
from typing import Optional

class Trip(SQLModel, table=True):
    __tablename__ = "trips" # type: ignore
    
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    user_id: uuid.UUID = Field(foreign_key="users.id")
    vehicle_id: uuid.UUID = Field(foreign_key="user_vehicles.id")
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
    created_at: datetime = Field(default_factory=datetime.utcnow)