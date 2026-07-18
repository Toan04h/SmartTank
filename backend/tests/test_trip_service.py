import uuid
import pytest
from fastapi import HTTPException
from app.models.user_vehicle import UserVehicle
from app.models.vehicle_catalog import VehicleCatalog
from app.services.calculation_service import haversine_distance
from app.services.trip_service import get_vehicle_mpg_and_fuel_type, create_trip
from app.schemas.trip_log import TripCreate
from tests.conftest import make_user, make_user_vehicle

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

# --- create_trip ---

async def _fake_get_fuel_price(fuel_type, state=None):
    return {"price": 3.5, "unit": "dollars per gallon", "fuel_type": fuel_type}

@pytest.mark.anyio
async def test_create_trip_manual_distance(session, monkeypatch):
    monkeypatch.setattr("app.services.trip_service.get_fuel_price", _fake_get_fuel_price)
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id, mpg_override=25.0)

    trip = await create_trip(
        TripCreate(vehicle_id=vehicle.id, distance=100.0),
        user.id,
        user.state,
        session,
    )

    assert trip.distance == 100.0
    assert trip.gallons_used == 4.0
    assert trip.fuel_price == 3.5
    assert trip.trip_cost == 14.0
    assert trip.co2_kg == 35.55

@pytest.mark.anyio
async def test_create_trip_gps_only_computes_haversine_distance(session, monkeypatch):
    monkeypatch.setattr("app.services.trip_service.get_fuel_price", _fake_get_fuel_price)
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id, mpg_override=25.0)
    start_lat, start_lng = 40.7128, -74.0060
    end_lat, end_lng = 34.0522, -118.2437

    trip = await create_trip(
        TripCreate(
            vehicle_id=vehicle.id,
            start_lat=start_lat, start_lng=start_lng,
            end_lat=end_lat, end_lng=end_lng,
        ),
        user.id,
        user.state,
        session,
    )

    assert trip.distance == haversine_distance(start_lat, start_lng, end_lat, end_lng)

@pytest.mark.anyio
async def test_create_trip_vehicle_not_owned_raises_404(session, monkeypatch):
    monkeypatch.setattr("app.services.trip_service.get_fuel_price", _fake_get_fuel_price)
    user = make_user(session)
    other_user = make_user(session)
    other_vehicle = make_user_vehicle(session, other_user.id, mpg_override=25.0)

    with pytest.raises(HTTPException) as exc_info:
        await create_trip(
            TripCreate(vehicle_id=other_vehicle.id, distance=100.0),
            user.id,
            user.state,
            session,
        )
    assert exc_info.value.status_code == 404
