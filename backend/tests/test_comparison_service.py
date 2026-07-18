import uuid
import pytest
from fastapi import HTTPException
from app.services.comparison_service import compare_vehicle
from app.schemas.comparison import CompareRequest
from tests.conftest import make_user, make_user_vehicle, make_vehicle_catalog, make_trip

calls = []

async def _tracking_get_fuel_price(fuel_type, state=None):
    calls.append((fuel_type, state))
    return {"price": 3.5, "unit": "dollars per gallon", "fuel_type": fuel_type}

@pytest.fixture(autouse=True)
def _reset_calls(monkeypatch):
    monkeypatch.setattr("app.services.comparison_service.get_fuel_price", _tracking_get_fuel_price)
    calls.clear()
    yield
    calls.clear()

@pytest.mark.anyio
async def test_no_default_vehicle_raises_404(session):
    user = make_user(session)

    with pytest.raises(HTTPException) as exc_info:
        await compare_vehicle(CompareRequest(vehicle_list=[uuid.uuid4()]), user, session)
    assert exc_info.value.status_code == 404

@pytest.mark.anyio
async def test_default_vehicle_missing_catalog_raises_404(session):
    user = make_user(session)
    make_user_vehicle(session, user.id, is_default=True, catalog_id=uuid.uuid4())
    other_catalog = make_vehicle_catalog(session)

    with pytest.raises(HTTPException) as exc_info:
        await compare_vehicle(CompareRequest(vehicle_list=[other_catalog.id]), user, session)
    assert exc_info.value.status_code == 404
    assert "vehicle catalog" in exc_info.value.detail.lower()

@pytest.mark.anyio
async def test_baseline_mpg_alt_beats_combined_when_no_override(session):
    user = make_user(session)
    baseline_catalog = make_vehicle_catalog(session, combined_mpg=20.0, combined_mpg_alt=40.0, fuel_type="Regular Gasoline")
    baseline_vehicle = make_user_vehicle(session, user.id, is_default=True, catalog_id=baseline_catalog.id)
    make_trip(session, user.id, baseline_vehicle.id, distance=100.0)
    other_catalog = make_vehicle_catalog(session, combined_mpg=25.0)

    result = await compare_vehicle(CompareRequest(vehicle_list=[other_catalog.id]), user, session)

    # mpg=40 (alt) -> gallons=2.5, cost=8.75; if combined_mpg=20 had been used cost would be 17.5
    assert result[0].total_cost == 8.75

@pytest.mark.anyio
async def test_baseline_mpg_override_beats_alt_and_combined(session):
    user = make_user(session)
    baseline_catalog = make_vehicle_catalog(session, combined_mpg=20.0, combined_mpg_alt=40.0, fuel_type="Regular Gasoline")
    baseline_vehicle = make_user_vehicle(session, user.id, is_default=True, catalog_id=baseline_catalog.id, mpg_override=50.0)
    make_trip(session, user.id, baseline_vehicle.id, distance=100.0)
    other_catalog = make_vehicle_catalog(session, combined_mpg=25.0)

    result = await compare_vehicle(CompareRequest(vehicle_list=[other_catalog.id]), user, session)

    # mpg=50 (override) -> gallons=2.0, cost=7.0
    assert result[0].total_cost == 7.0

@pytest.mark.anyio
async def test_no_mpg_info_available_raises_404(session):
    user = make_user(session)
    baseline_catalog = make_vehicle_catalog(session, combined_mpg=None, combined_mpg_alt=None)
    make_user_vehicle(session, user.id, is_default=True, catalog_id=baseline_catalog.id, mpg_override=None)

    with pytest.raises(HTTPException) as exc_info:
        await compare_vehicle(CompareRequest(vehicle_list=[baseline_catalog.id]), user, session)
    assert exc_info.value.status_code == 404
    assert "mpg" in exc_info.value.detail.lower()

@pytest.mark.anyio
async def test_zero_distance_short_circuits_without_fetching_fuel_price(session):
    user = make_user(session)
    baseline_catalog = make_vehicle_catalog(session, combined_mpg=20.0)
    make_user_vehicle(session, user.id, is_default=True, catalog_id=baseline_catalog.id)
    other_catalog = make_vehicle_catalog(session, combined_mpg=40.0)

    result = await compare_vehicle(CompareRequest(vehicle_list=[other_catalog.id]), user, session)

    assert all(r.total_cost == 0.0 for r in result)
    assert calls == []

@pytest.mark.anyio
async def test_multi_vehicle_compare_computes_savings_relative_to_baseline(session):
    user = make_user(session)
    baseline_catalog = make_vehicle_catalog(session, combined_mpg=20.0, fuel_type="Regular Gasoline")
    baseline_vehicle = make_user_vehicle(session, user.id, is_default=True, catalog_id=baseline_catalog.id)
    make_trip(session, user.id, baseline_vehicle.id, distance=100.0)
    efficient_catalog = make_vehicle_catalog(session, combined_mpg=40.0, fuel_type="Regular Gasoline")

    result = await compare_vehicle(CompareRequest(vehicle_list=[efficient_catalog.id]), user, session)

    baseline, comparison = result
    assert baseline.is_baseline is True
    assert baseline.total_cost == 17.5
    assert baseline.estimated_savings is None

    assert comparison.is_baseline is False
    assert comparison.total_cost == 8.75
    assert comparison.estimated_savings == 8.75

@pytest.mark.anyio
async def test_compared_vehicle_unknown_catalog_raises_404(session):
    user = make_user(session)
    baseline_catalog = make_vehicle_catalog(session, combined_mpg=20.0)
    make_user_vehicle(session, user.id, is_default=True, catalog_id=baseline_catalog.id)

    with pytest.raises(HTTPException) as exc_info:
        await compare_vehicle(CompareRequest(vehicle_list=[uuid.uuid4()]), user, session)
    assert exc_info.value.status_code == 404

@pytest.mark.anyio
async def test_compared_vehicle_no_mpg_raises_404(session):
    user = make_user(session)
    baseline_catalog = make_vehicle_catalog(session, combined_mpg=20.0)
    make_user_vehicle(session, user.id, is_default=True, catalog_id=baseline_catalog.id)
    no_mpg_catalog = make_vehicle_catalog(session, combined_mpg=None, combined_mpg_alt=None)

    with pytest.raises(HTTPException) as exc_info:
        await compare_vehicle(CompareRequest(vehicle_list=[no_mpg_catalog.id]), user, session)
    assert exc_info.value.status_code == 404
