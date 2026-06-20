import math

# Source: US EPA - burning 1 gallon of gasoline produces 8.887 kg of CO2
CO2_KG_PER_GALLON = 8.887

def calculate_trip_cost(
    distance: float, 
    mpg: float, 
    fuel_price: float
    ) -> dict:
    """
    Calculates fuel cost and CO2 emissions for a trip.
    
    Args:
        distance: miles driven
        mpg: vehicle's miles per gallon
        fuel_price: current price per gallon in dollars
        
    Returns: 
        dict: gallon_used, trip_cost, co2_kg
    """
    if mpg <= 0:
        raise ValueError("MPG must be greater than 0")
    if distance <= 0:
        raise ValueError("Distance must be greater than 0")
    if fuel_price <= 0:
        raise ValueError("Fuel price must be greater than 0")
    gallons_used = round(distance / mpg, 2)
    trip_cost = round(gallons_used * fuel_price, 2)
    co2_kg = round(gallons_used * 8.887, 2)
    
    return {
        "gallons_used": gallons_used,
        "trip_cost": trip_cost,
        "co2_kg": co2_kg
    }

def haversine_distance(
    start_lat: float, start_lng: float,
    end_lat: float, end_lng: float
) -> float:
    """
    Calculates straight-line distance between two GPS coordinates using the Haversine formula.

    Args:
        start_lat, start_lng: starting coordinates
        end_lat, end_lng: ending coordinates

    Returns:
        float: distance in miles, rounded to 2 decimal places
        
    Note:
        This is straight-line distance, not actual driving distance
    """
    R = 3958.8 # Earth's radius in miles
    
    lat1, lat2 = math.radians(start_lat), math.radians(end_lat)
    dlat = math.radians(end_lat - start_lat)
    dlng = math.radians(end_lng - start_lng)
    
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) *math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return round(R * c, 2)