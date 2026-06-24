import uuid
import pytest
from fastapi import HTTPException
from sqlmodel import SQLModel, Session, create_engine
from app.models.user import User
from app.services.trip_service import get_vehicle_mpg
from app.models.user_vehicle import UserVehicle
from app.models.vehicle_catalog import VehicleCatalog

@pytest.fixture
def session():
    engine = create_engine("sqlite://")  # temporary in-memory database
    SQLModel.metadata.create_all(engine)  # creates all your tables in it
    with Session(engine) as session:
        yield session

def test_mpg_override_takes_priority(session):
    vehicle = UserVehicle(user_id=uuid.uuid4(), mpg_override=35.0)
    assert get_vehicle_mpg(vehicle, session) == 35.0

def test_no_mpg_data(session):
    vehicle = UserVehicle(user_id=uuid.uuid4())
    with pytest.raises(HTTPException) as exc_info:
        get_vehicle_mpg(vehicle, session)

    assert exc_info.value.status_code == 400
    # print(exc_info.value)
    # print(exc_info.value.status_code)
    # print(exc_info.value.detail)

def test_catalog_entry_not_found(session):
    vehicle = UserVehicle(user_id=uuid.uuid4(), catalog_id=uuid.uuid4())
    with pytest.raises(HTTPException) as exc_info:
        get_vehicle_mpg(vehicle, session)
    assert exc_info.value.status_code == 404
    # print(exc_info.value)
    # print(exc_info.value.status_code)
    # print(exc_info.value.detail)

def test_catalog_combined_mpg_is_none(session):
    catalog = VehicleCatalog(make="Honda", model="Civic", year=2020)
    session.add(catalog)
    session.commit()
    session.refresh(catalog)

    vehicle = UserVehicle(user_id=uuid.uuid4(), catalog_id=catalog.id)

    with pytest.raises(HTTPException) as exc_info:
        get_vehicle_mpg(vehicle, session)
    assert exc_info.value.status_code == 400
    # print(exc_info.value)
    # print(exc_info.value.status_code)
    # print(exc_info.value.detail)

def test_normal_get_vehicle_mpg(session):
    catalog = VehicleCatalog(make="Honda", model="Accord", year=2021, combined_mpg=20)
    session.add(catalog)
    session.commit()
    session.refresh(catalog)

    vehicle = UserVehicle(user_id=uuid.uuid4(), catalog_id=catalog.id)

    assert get_vehicle_mpg(vehicle, session) == 20