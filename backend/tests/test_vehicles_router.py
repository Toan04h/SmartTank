import uuid
from app.models.user_vehicle import UserVehicle
from app.models.trip import Trip
from tests.conftest import make_user, make_vehicle_catalog, make_user_vehicle, make_trip

# --- catalog lookups ---

def test_get_years(client, session):
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2021)
    make_vehicle_catalog(session, make="Toyota", model="Camry", year=2022)

    response = client.get("/vehicles/years")

    assert response.status_code == 200
    assert response.json() == [2022, 2021]

def test_get_makes_by_year(client, session):
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2021)

    response = client.get("/vehicles/makes", params={"year": 2021})

    assert response.status_code == 200
    assert response.json() == ["Honda"]

def test_get_models_by_year_make(client, session):
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2021)

    response = client.get("/vehicles/models", params={"year": 2021, "make": "Honda"})

    assert response.status_code == 200
    assert response.json() == ["Accord"]

def test_search_success(client, session):
    make_vehicle_catalog(session, make="Honda", model="Accord", year=2021, epa_vehicle_id="EPA123")

    response = client.post("/vehicles/search", json={"make": "Honda", "model": "Accord", "year": 2021})

    assert response.status_code == 200
    assert len(response.json()) == 1

def test_search_not_found_returns_404(client):
    response = client.post("/vehicles/search", json={"make": "Nope", "model": "Nope", "year": 1999})

    assert response.status_code == 404

# --- POST /vehicles (add to garage) ---

def test_add_vehicle_mpg_override_beats_catalog_and_alt(client, session):
    catalog = make_vehicle_catalog(session, combined_mpg=25.0, combined_mpg_alt=130.0)

    response = client.post("/vehicles", json={
        "catalog_id": str(catalog.id),
        "mpg_override": 99.0,
        "is_default": False,
    })

    assert response.status_code == 201
    assert response.json()["mpg_override"] == 99.0

def test_add_vehicle_alt_mpg_beats_combined_mpg_when_no_override(client, session):
    catalog = make_vehicle_catalog(session, combined_mpg=25.0, combined_mpg_alt=130.0)

    response = client.post("/vehicles", json={"catalog_id": str(catalog.id), "is_default": False})

    assert response.status_code == 201
    assert response.json()["mpg_override"] == 130.0

def test_add_vehicle_unknown_catalog_returns_404(client):
    response = client.post("/vehicles", json={"catalog_id": str(uuid.uuid4()), "is_default": False})

    assert response.status_code == 404

# --- GET /vehicles/garage ---

def test_garage_only_lists_current_users_vehicles(client, session, test_user):
    other_user = make_user(session)
    make_user_vehicle(session, test_user.id)
    make_user_vehicle(session, other_user.id)

    response = client.get("/vehicles/garage")

    assert response.status_code == 200
    assert len(response.json()) == 1

# --- GET /vehicles/{id}/stats ---

def test_vehicle_stats_empty_state(client, session, test_user):
    vehicle = make_user_vehicle(session, test_user.id)

    response = client.get(f"/vehicles/{vehicle.id}/stats")

    assert response.status_code == 200
    assert response.json()["total_trips"] == 0

# --- PATCH /vehicles/{id}/default ---

def test_set_default_vehicle_swaps_previous_default(client, session, test_user):
    old_default = make_user_vehicle(session, test_user.id, is_default=True)
    new_default = make_user_vehicle(session, test_user.id, is_default=False)

    response = client.patch(f"/vehicles/{new_default.id}/default")

    assert response.status_code == 200
    assert response.json()["is_default"] is True

    session.refresh(old_default)
    assert old_default.is_default is False

def test_set_default_vehicle_not_owned_returns_404(client):
    response = client.patch(f"/vehicles/{uuid.uuid4()}/default")

    assert response.status_code == 404

# --- PATCH /vehicles/{id} ---

def test_edit_vehicle_success(client, session, test_user):
    vehicle = make_user_vehicle(session, test_user.id, nickname="Old")

    response = client.patch(f"/vehicles/{vehicle.id}", json={"nickname": "New"})

    assert response.status_code == 200
    assert response.json()["nickname"] == "New"

def test_edit_vehicle_not_owned_returns_404(client, session):
    other_user = make_user(session)
    vehicle = make_user_vehicle(session, other_user.id)

    response = client.patch(f"/vehicles/{vehicle.id}", json={"nickname": "Hijacked"})

    assert response.status_code == 404

# --- DELETE /vehicles/{id} ---

def test_delete_vehicle_cascades_trips(client, session, test_user):
    vehicle = make_user_vehicle(session, test_user.id)
    trip = make_trip(session, test_user.id, vehicle.id)

    response = client.delete(f"/vehicles/{vehicle.id}")

    assert response.status_code == 204
    assert session.get(UserVehicle, vehicle.id) is None
    assert session.get(Trip, trip.id) is None

def test_delete_vehicle_not_owned_returns_404(client, session):
    other_user = make_user(session)
    vehicle = make_user_vehicle(session, other_user.id)

    response = client.delete(f"/vehicles/{vehicle.id}")

    assert response.status_code == 404
