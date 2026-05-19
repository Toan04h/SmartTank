import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field
from typing import Optional

class UserVehicle(SQLModel, table=True):
    __tablename__ = "user_vehicles" # type: ignore
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    user_id: uuid.UUID = Field(foreign_key="users.id")
    catalog_id: uuid.UUID = Field(default=None, foreign_key="vehicle_catalog.id")
    nickname: Optional[str] = None
    make: str
    model: str
    year: int
    mpg_override: Optional[float] = None
    is_default: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)