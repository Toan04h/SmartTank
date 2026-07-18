import calendar
import pytest
from datetime import datetime, timedelta
from app.services.dashboard_service import build_dashboard
from tests.conftest import make_user, make_user_vehicle, make_trip

def _current_month_bounds():
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1, 0, 0, 0)
    _, total_days = calendar.monthrange(now.year, now.month)
    end_of_month = datetime(now.year, now.month, total_days, 23, 59, 59)
    return start_of_month, end_of_month

@pytest.mark.anyio
async def test_dashboard_empty_state(session):
    user = make_user(session)

    dashboard = await build_dashboard(user, session)

    assert dashboard.total_trips == 0
    assert dashboard.total_distance == 0.0
    assert dashboard.recent_trips == []
    assert dashboard.default_vehicle is None

@pytest.mark.anyio
async def test_dashboard_aggregates_trips_in_current_month(session):
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id, mpg_override=25.0)
    start_of_month, _ = _current_month_bounds()
    within_month = start_of_month + timedelta(days=1)
    make_trip(session, user.id, vehicle.id, distance=10.0, gallons_used=1.0, trip_cost=3.5, co2_kg=8.89, created_at=within_month)
    make_trip(session, user.id, vehicle.id, distance=20.0, gallons_used=2.0, trip_cost=7.0, co2_kg=17.77, created_at=within_month)

    dashboard = await build_dashboard(user, session)

    assert dashboard.total_trips == 2
    assert dashboard.total_distance == 30.0
    assert dashboard.total_cost == 10.5

@pytest.mark.anyio
async def test_dashboard_excludes_trips_outside_current_month(session):
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id, mpg_override=25.0)
    start_of_month, end_of_month = _current_month_bounds()
    make_trip(session, user.id, vehicle.id, created_at=start_of_month - timedelta(seconds=1))
    make_trip(session, user.id, vehicle.id, created_at=end_of_month + timedelta(seconds=1))

    dashboard = await build_dashboard(user, session)

    assert dashboard.total_trips == 0

@pytest.mark.anyio
async def test_dashboard_recent_trips_capped_at_five_newest_first(session):
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id, mpg_override=25.0)
    start_of_month, _ = _current_month_bounds()
    created_trips = [
        make_trip(session, user.id, vehicle.id, created_at=start_of_month + timedelta(days=i))
        for i in range(7)
    ]

    dashboard = await build_dashboard(user, session)

    assert len(dashboard.recent_trips) == 5
    assert dashboard.recent_trips[0].id == created_trips[-1].id

@pytest.mark.anyio
async def test_dashboard_includes_default_vehicle_when_set(session):
    user = make_user(session)
    vehicle = make_user_vehicle(session, user.id, is_default=True)

    dashboard = await build_dashboard(user, session)

    assert dashboard.default_vehicle is not None
    assert dashboard.default_vehicle.id == vehicle.id

@pytest.mark.anyio
async def test_dashboard_default_vehicle_none_when_no_default_set(session):
    user = make_user(session)
    make_user_vehicle(session, user.id, is_default=False)

    dashboard = await build_dashboard(user, session)

    assert dashboard.default_vehicle is None
