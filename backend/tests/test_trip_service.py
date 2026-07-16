import uuid
import pytest
from fastapi import HTTPException
from app.models.user_vehicle import UserVehicle
from app.models.vehicle_catalog import VehicleCatalog
from app.services.trip_service import get_vehicle_mpg_and_fuel_type

def test_mpg_override_takes_priority(session):
    vehicle = UserVehicle(user_id=uuid.uuid4(), mpg_override=35.0)
    assert get_vehicle_mpg_and_fuel_type(vehicle, session) == (35.0, "Regular Gasoline")

def test_no_catalog_and_no_override_raises_not_found(session):
    vehicle = UserVehicle(user_id=uuid.uuid4())
    with pytest.raises(HTTPException) as exc_info:
        get_vehicle_mpg_and_fuel_type(vehicle, session)

    assert exc_info.value.status_code == 404

def test_catalog_entry_not_found(session):
    vehicle = UserVehicle(user_id=uuid.uuid4(), catalog_id=uuid.uuid4())
    with pytest.raises(HTTPException) as exc_info:
        get_vehicle_mpg_and_fuel_type(vehicle, session)
    assert exc_info.value.status_code == 404

def test_catalog_combined_mpg_is_none(session):
    catalog = VehicleCatalog(make="Honda", model="Civic", year=2020)
    session.add(catalog)
    session.commit()
    session.refresh(catalog)

    vehicle = UserVehicle(user_id=uuid.uuid4(), catalog_id=catalog.id)

    with pytest.raises(HTTPException) as exc_info:
        get_vehicle_mpg_and_fuel_type(vehicle, session)
    assert exc_info.value.status_code == 400

def test_normal_get_vehicle_mpg(session):
    catalog = VehicleCatalog(make="Honda", model="Accord", year=2021, combined_mpg=20)
    session.add(catalog)
    session.commit()
    session.refresh(catalog)

    vehicle = UserVehicle(user_id=uuid.uuid4(), catalog_id=catalog.id)

    assert get_vehicle_mpg_and_fuel_type(vehicle, session) == (20, "Regular Gasoline")

def test_fuel_type_comes_from_catalog(session):
    catalog = VehicleCatalog(make="Tesla", model="Model 3", year=2022, fuel_type="Electricity", combined_mpg=130)
    session.add(catalog)
    session.commit()
    session.refresh(catalog)

    vehicle = UserVehicle(user_id=uuid.uuid4(), catalog_id=catalog.id)

    assert get_vehicle_mpg_and_fuel_type(vehicle, session) == (130, "Electricity")
