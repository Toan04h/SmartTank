import uuid
import pytest
from fastapi import HTTPException
from app.services.vehicle_service import (
    search_vehicle_from_db,
    get_all_years,
    get_makes_by_year,
    get_models_by_year_make,
    add_user_vehicle,
    get_user_vehicles,
    update_user_vehicle,
    delete_user_vehicle,
    build_vehicle_stat,
)
from app.schemas.vehicle import UserVehicleCreate, UserVehicleUpdate
from app.models.trip import Trip
from tests.conftest import make_user, make_vehicle_catalog, make_user_vehicle, make_trip

# --- search_vehicle_from_db ---

def test_search_is_case_insensitive_on_make(session):
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2021)

    results = search_vehicle_from_db("honda", "Accord", 2021, session)

    assert len(results) == 1

def test_search_matches_partial_model(session):
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2021)

    results = search_vehicle_from_db("Honda", "cor", 2021, session)

    assert len(results) == 1

def test_search_not_found_raises_404(session):
    with pytest.raises(HTTPException) as exc_info:
        search_vehicle_from_db("Toyota", "Camry", 1999, session)
    assert exc_info.value.status_code == 404

# --- cascading catalog lookups ---

def test_get_all_years_returns_distinct_sorted_descending(session):
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2020)
    make_vehicle_catalog(session, make="Toyota", model="Camry", year=2022)
    make_vehicle_catalog(session, make="Ford", model="Focus", year=2020)

    assert get_all_years(session) == [2022, 2020]

def test_get_makes_by_year_filters_and_sorts(session):
    make_vehicle_catalog(session, make="Toyota", model="Camry", year=2021)
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2021)
    make_vehicle_catalog(session, make="Ford", model="Focus", year=2020)

    assert get_makes_by_year(2021, session) == ["Honda", "Toyota"]

def test_get_models_by_year_make_filters_and_sorts(session):
    make_vehicle_catalog(session, make="Honda", model="Civic", year=2021)
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2021)
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2020)

    assert get_models_by_year_make(2021, "honda", session) == ["Accord", "Civic"]

# --- add_user_vehicle ---

@pytest.mark.anyio
async def test_add_vehicle_as_default_with_no_existing_default(session):
    user = make_user(session)

    result = await add_user_vehicle(
        UserVehicleCreate(catalog_id=uuid.uuid4(), make="Honda", model="Accord", year=2021, is_default=True),
        user.id,
        session,
    )

    assert result["is_default"] is True

@pytest.mark.anyio
async def test_add_vehicle_as_default_unsets_previous_default(session):
    user = make_user(session)
    existing_default = make_user_vehicle(session, user.id, is_default=True)

    await add_user_vehicle(
        UserVehicleCreate(catalog_id=uuid.uuid4(), make="Toyota", model="Camry", year=2022, is_default=True),
        user.id,
        session,
    )

    session.refresh(existing_default)
    assert existing_default.is_default is False

@pytest.mark.anyio
async def test_add_vehicle_not_default_leaves_existing_default_untouched(session):
    user = make_user(session)
    existing_default = make_user_vehicle(session, user.id, is_default=True)

    await add_user_vehicle(
        UserVehicleCreate(catalog_id=uuid.uuid4(), make="Toyota", model="Camry", year=2022, is_default=False),
        user.id,
        session,
    )

    session.refresh(existing_default)
    assert existing_default.is_default is True

# --- get_user_vehicles ---

def test_get_user_vehicles_only_returns_own_vehicles(session):
    user_a = make_user(session)
    user_b = make_user(session)
    make_user_vehicle(session, user_a.id)
    make_user_vehicle(session, user_b.id)

    results = get_user_vehicles(user_a.id, session)

    assert len(results) == 1
    assert results[0].user_id == user_a.id

# --- update_user_vehicle ---

def test_update_vehicle_partial_nickname_only(session):
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id, nickname="Old Name", mpg_override=25.0)

    updated = update_user_vehicle(vehicle.id, user.id, UserVehicleUpdate(nickname="New Name"), session)

    assert updated.nickname == "New Name"
    assert updated.mpg_override == 25.0

def test_update_vehicle_not_owned_raises_404(session):
    user = make_user(session)
    other_user = make_user(session)
    vehicle = make_user_vehicle(session, other_user.id)

    with pytest.raises(HTTPException) as exc_info:
        update_user_vehicle(vehicle.id, user.id, UserVehicleUpdate(nickname="Hijacked"), session)
    assert exc_info.value.status_code == 404

# --- delete_user_vehicle ---

def test_delete_vehicle_cascades_to_trips(session):
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id)
    trip = make_trip(session, user.id, vehicle.id)

    delete_user_vehicle(vehicle.id, user.id, session)

    assert session.get(Trip, trip.id) is None

def test_delete_vehicle_not_owned_raises_404(session):
    user = make_user(session)
    other_user = make_user(session)
    vehicle = make_user_vehicle(session, other_user.id)

    with pytest.raises(HTTPException) as exc_info:
        delete_user_vehicle(vehicle.id, user.id, session)
    assert exc_info.value.status_code == 404

# --- build_vehicle_stat ---

@pytest.mark.anyio
async def test_vehicle_stat_empty_state(session):
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id)

    stats = await build_vehicle_stat(vehicle.id, user, session)

    assert stats.total_trips == 0
    assert stats.total_distance == 0
    assert stats.total_cost == 0

@pytest.mark.anyio
async def test_vehicle_stat_aggregates_and_rounds(session):
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id)
    make_trip(session, user.id, vehicle.id, distance=10.111, gallons_used=1.111, trip_cost=3.555, co2_kg=8.111)
    make_trip(session, user.id, vehicle.id, distance=20.222, gallons_used=2.222, trip_cost=7.555, co2_kg=16.222)

    stats = await build_vehicle_stat(vehicle.id, user, session)

    assert stats.total_trips == 2
    assert stats.total_distance == round(10.111 + 20.222, 2)
    assert stats.total_cost == round(3.555 + 7.555, 2)

@pytest.mark.anyio
async def test_vehicle_stat_ignores_other_vehicles_and_users(session):
    user = make_user(session)
    other_user = make_user(session)
    vehicle = make_user_vehicle(session, user.id)
    other_vehicle = make_user_vehicle(session, user.id)
    other_user_vehicle = make_user_vehicle(session, other_user.id)
    make_trip(session, user.id, vehicle.id)
    make_trip(session, user.id, other_vehicle.id)
    make_trip(session, other_user.id, other_user_vehicle.id)

    stats = await build_vehicle_stat(vehicle.id, user, session)

    assert stats.total_trips == 1
