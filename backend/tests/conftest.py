import uuid
from typing import Any
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.models.user import User
from app.models.user_vehicle import UserVehicle
from app.models.vehicle_catalog import VehicleCatalog
from app.models.trip import Trip


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def session():
    # StaticPool keeps a single shared connection alive for the whole engine,
    # since TestClient runs endpoint code in a worker thread and the default
    # SQLite in-memory pool is per-thread (each thread would otherwise see its
    # own empty database).
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def test_user(session):
    return make_user(session)


@pytest.fixture
def client(session, test_user):
    def override_get_session():
        yield session

    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    limiter.reset()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def make_user(session, **overrides: Any):
    defaults: dict[str, Any] = dict(
        email=f"{uuid.uuid4()}@example.com",
        hashed_password="not-a-real-hash",
        full_name="Test User",
        state="CA",
        zip_code="90210",
    )
    defaults.update(overrides)
    user = User(**defaults)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def make_vehicle_catalog(session, **overrides: Any):
    defaults: dict[str, Any] = dict(
        make="Honda",
        model="Accord",
        year=2021,
        fuel_type="Regular Gasoline",
        combined_mpg=30.0,
    )
    defaults.update(overrides)
    catalog = VehicleCatalog(**defaults)
    session.add(catalog)
    session.commit()
    session.refresh(catalog)
    return catalog


def make_user_vehicle(session, user_id, **overrides: Any):
    defaults: dict[str, Any] = dict(
        user_id=user_id,
        catalog_id=uuid.uuid4(),
        make="Honda",
        model="Accord",
        year=2021,
    )
    defaults.update(overrides)
    vehicle = UserVehicle(**defaults)
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def make_trip(session, user_id, vehicle_id, **overrides: Any):
    defaults: dict[str, Any] = dict(
        user_id=user_id,
        vehicle_id=vehicle_id,
        distance=10.0,
        gallons_used=1.0,
        fuel_price=3.5,
        trip_cost=3.5,
        co2_kg=8.89,
    )
    defaults.update(overrides)
    trip = Trip(**defaults)
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip
