import pytest
from app.services.calculation_service import calculate_trip_cost

def test_normal_trip_calculation():
    result = calculate_trip_cost(30, 25, 3.5)
    
    assert result["gallons_used"] == 1.2
    assert result["trip_cost"] == 4.2
    assert result["co2_kg"] == 10.66
    
def test_minimum_valid_input():
    result = calculate_trip_cost(0.1, 0.1, 0.1)
    
    assert result["gallons_used"] == 1
    assert result["trip_cost"] == 0.1
    assert result["co2_kg"] == 8.89
    
def test_zero_mpg_raises_error():
    with pytest.raises(ValueError):
        calculate_trip_cost(100, 0, 4)
        
def test_negative_distance_raises_error():
    with pytest.raises(ValueError):
        calculate_trip_cost(-10, 10, 5)
        
def test_zero_fuel_price_raises_error():
    with pytest.raises(ValueError):
        calculate_trip_cost(100, 10, 0)