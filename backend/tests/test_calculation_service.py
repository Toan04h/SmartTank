import pytest
from app.services.calculation_service import calculate_trip_cost, haversine_distance

def test_normal_trip_calculation():
    result = calculate_trip_cost(30, 25, 3.5, "Regular Gasoline")

    assert result["gallons_used"] == 1.2
    assert result["trip_cost"] == 4.2
    assert result["co2_kg"] == 10.66

def test_minimum_valid_input():
    result = calculate_trip_cost(0.1, 0.1, 0.1, "Regular Gasoline")

    assert result["gallons_used"] == 1
    assert result["trip_cost"] == 0.1
    assert result["co2_kg"] == 8.89

def test_zero_mpg_raises_error():
    with pytest.raises(ValueError):
        calculate_trip_cost(100, 0, 4, "Regular Gasoline")

def test_negative_distance_raises_error():
    with pytest.raises(ValueError):
        calculate_trip_cost(-10, 10, 5, "Regular Gasoline")

def test_zero_fuel_price_raises_error():
    with pytest.raises(ValueError):
        calculate_trip_cost(100, 10, 0, "Regular Gasoline")

def test_diesel_uses_diesel_co2_factor():
    result = calculate_trip_cost(60, 30, 4.0, "Diesel")

    assert result["gallons_used"] == 2.0
    assert result["trip_cost"] == 8.0
    assert result["co2_kg"] == 20.36

def test_electricity_converts_gallons_to_kwh_and_zeroes_co2():
    # mpg here is MPGe, fuel_price is dollars per kWh
    result = calculate_trip_cost(100, 100, 0.13, "Electricity")

    assert result["gallons_used"] == 1.0
    assert result["trip_cost"] == 4.38
    assert result["co2_kg"] == 0.0

def test_unrecognized_fuel_type_falls_back_to_gasoline_math():
    result = calculate_trip_cost(30, 25, 3.5, "Premium Gasoline")

    assert result["gallons_used"] == 1.2
    assert result["trip_cost"] == 4.2
    assert result["co2_kg"] == 10.66

def test_non_terminating_division_rounds_to_two_decimals():
    result = calculate_trip_cost(10, 3, 1, "Regular Gasoline")

    assert result["gallons_used"] == 3.33
    assert result["trip_cost"] == 3.33
    assert result["co2_kg"] == 29.59

def test_haversine_same_point_is_zero_distance():
    assert haversine_distance(40.0, -75.0, 40.0, -75.0) == 0.0

def test_haversine_known_city_pair():
    # New York City to Los Angeles
    distance = haversine_distance(40.7128, -74.0060, 34.0522, -118.2437)

    assert distance == pytest.approx(2445.59, abs=0.5)

def test_haversine_one_degree_latitude_at_equator():
    distance = haversine_distance(0.0, 0.0, 1.0, 0.0)

    assert distance == pytest.approx(69.09, abs=0.5)

def test_haversine_antipodal_points_span_half_earth_circumference():
    distance = haversine_distance(0.0, 0.0, 0.0, 180.0)

    assert distance == pytest.approx(12436.94, abs=0.5)