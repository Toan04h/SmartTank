from sqlmodel import SQLModel, Session, create_engine
from app.core.config import settings
from app.models.user import User # noqa: F401
from app.models.vehicle_catalog import VehicleCatalog # noqa: F401
from app.models.user_vehicle import UserVehicle # noqa: F401
from app.models.trip import Trip # noqa: F401
from app.models.refresh_token import RefreshToken # noqa: F401
from typing import Generator

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development"
)

def init_db():
    SQLModel.metadata.create_all(engine)
    
def get_session() -> Generator:
    with Session(engine, expire_on_commit=False) as session:
        yield session