from tests.conftest import make_user, make_user_vehicle, make_trip

async def _fake_get_fuel_price(fuel_type, state=None):
    return {"price": 3.5, "unit": "dollars per gallon", "fuel_type": fuel_type}

def _fake_generate_upload_url(trip_id):
    return {"upload_url": f"https://fake-s3.example/{trip_id}", "object_key": f"trips/{trip_id}/route.png"}

def _fake_generate_download_url(object_key):
    return f"https://fake-s3.example/{object_key}"

# --- POST /trips ---

def test_log_trip_manual_distance_success(client, session, test_user, monkeypatch):
    monkeypatch.setattr("app.services.trip_service.get_fuel_price", _fake_get_fuel_price)
    vehicle = make_user_vehicle(session, test_user.id, mpg_override=25.0)

    response = client.post("/trips", json={"vehicle_id": str(vehicle.id), "distance": 100.0})

    assert response.status_code == 201
    body = response.json()
    assert body["distance"] == 100.0
    assert body["trip_cost"] == 14.0

def test_log_trip_without_distance_or_gps_returns_422(client, session, test_user):
    vehicle = make_user_vehicle(session, test_user.id, mpg_override=25.0)

    response = client.post("/trips", json={"vehicle_id": str(vehicle.id)})

    assert response.status_code == 422

def test_log_trip_vehicle_not_owned_returns_404(client, session, monkeypatch):
    monkeypatch.setattr("app.services.trip_service.get_fuel_price", _fake_get_fuel_price)
    other_user = make_user(session)
    other_vehicle = make_user_vehicle(session, other_user.id, mpg_override=25.0)

    response = client.post("/trips", json={"vehicle_id": str(other_vehicle.id), "distance": 50.0})

    assert response.status_code == 404

def test_log_trip_unexpected_error_returns_generic_message(client, session, test_user, monkeypatch):
    async def _raise(fuel_type, state=None):
        raise RuntimeError("connection string: postgresql://user:hunter2@internal-db/prod")
    monkeypatch.setattr("app.services.trip_service.get_fuel_price", _raise)
    vehicle = make_user_vehicle(session, test_user.id, mpg_override=25.0)

    response = client.post("/trips", json={"vehicle_id": str(vehicle.id), "distance": 100.0})

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}

# --- GET /trips ---

def test_get_trips_only_lists_own_trips(client, session, test_user):
    other_user = make_user(session)
    vehicle = make_user_vehicle(session, test_user.id, mpg_override=25.0)
    other_vehicle = make_user_vehicle(session, other_user.id, mpg_override=25.0)
    make_trip(session, test_user.id, vehicle.id)
    make_trip(session, other_user.id, other_vehicle.id)

    response = client.get("/trips")

    assert response.status_code == 200
    assert len(response.json()) == 1

# --- GET /trips/{id} ---

def test_get_trip_detail_not_owned_returns_404(client, session):
    other_user = make_user(session)
    other_vehicle = make_user_vehicle(session, other_user.id, mpg_override=25.0)
    trip = make_trip(session, other_user.id, other_vehicle.id)

    response = client.get(f"/trips/{trip.id}")

    assert response.status_code == 404

# --- image endpoints ---

def test_get_image_upload_url(client, session, test_user, monkeypatch):
    monkeypatch.setattr("app.routers.trip_log.generate_upload_url", _fake_generate_upload_url)
    vehicle = make_user_vehicle(session, test_user.id, mpg_override=25.0)
    trip = make_trip(session, test_user.id, vehicle.id)

    response = client.post(f"/trips/{trip.id}/image-upload-url")

    assert response.status_code == 200
    assert response.json()["object_key"] == f"trips/{trip.id}/route.png"

def test_get_image_url_returns_404_when_no_image(client, session, test_user):
    vehicle = make_user_vehicle(session, test_user.id, mpg_override=25.0)
    trip = make_trip(session, test_user.id, vehicle.id)

    response = client.get(f"/trips/{trip.id}/image")

    assert response.status_code == 404

def test_save_image_key_then_get_image_url(client, session, test_user, monkeypatch):
    monkeypatch.setattr("app.routers.trip_log.generate_download_url", _fake_generate_download_url)
    vehicle = make_user_vehicle(session, test_user.id, mpg_override=25.0)
    trip = make_trip(session, test_user.id, vehicle.id)

    save_response = client.patch(f"/trips/{trip.id}/image", json={"object_key": "trips/abc/route.png"})
    assert save_response.status_code == 200
    assert save_response.json()["route_image_key"] == "trips/abc/route.png"

    get_response = client.get(f"/trips/{trip.id}/image")
    assert get_response.status_code == 200
    assert get_response.json()["image_url"] == "https://fake-s3.example/trips/abc/route.png"

# --- POST /cost/calculate ---

def test_calculate_cost_with_explicit_fuel_price(client):
    response = client.post("/cost/calculate", json={
        "distance": 30,
        "mpg": 25,
        "fuel_price": 3.5,
    })

    assert response.status_code == 200
    body = response.json()
    assert body["trip_cost"] == 4.2
    assert body["co2_kg"] == 10.66

def test_calculate_cost_fetches_price_when_omitted(client, monkeypatch):
    # Regression test for the price_data["price_per_gallon"] KeyError bug fixed in
    # sector 0 (get_fuel_price actually returns the key "price").
    monkeypatch.setattr("app.routers.trips.get_fuel_price", _fake_get_fuel_price)

    response = client.post("/cost/calculate", json={"distance": 30, "mpg": 25})

    assert response.status_code == 200
    assert response.json()["trip_cost"] == 4.2

def test_calculate_cost_invalid_distance_returns_422(client):
    response = client.post("/cost/calculate", json={"distance": -5, "mpg": 25, "fuel_price": 3.5})

    assert response.status_code == 422
