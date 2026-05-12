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

