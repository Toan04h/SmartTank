import uuid
from fastapi import HTTPException
from sqlmodel import Session, select
from app.models.user_vehicle import UserVehicle
from app.models.vehicle_catalog import VehicleCatalog
from app.models.trip import Trip
from app.schemas.trip_log import TripCreate
from app.services.fuel_service import get_fuel_price
from app.services.calculation_service import calculate_trip_cost, haversine_distance
from typing import Optional

def get_vehicle_mpg(vehicle: UserVehicle, session: Session) -> float:
    """Gets MPG for a vehicle - uses override if set, otherwise catalog value."""
    if vehicle.mpg_override is not None:
        return vehicle.mpg_override
    
    if vehicle.catalog_id is None:
        raise HTTPException(
            status_code=400,
            detail="Vehicle has no MPG data - please set an MPG override"
        )
        
    catalog = session.get(VehicleCatalog, vehicle.catalog_id)
    if catalog is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle catalog entry not found"
        )
        
    if catalog.combined_mpg is None:
        raise HTTPException(
            status_code=400,
            detail="No MPG data available for this vehicle - please set an MPG override"
        )
        
    return catalog.combined_mpg
    
async def create_trip(
    trip_data: TripCreate,
    user_id: uuid.UUID,
    user_state: Optional[str],
    session: Session
) -> Trip:
    """Creates and saves a trip for the authenticated user."""
    vehicle = session.exec(
        select(UserVehicle).where(
            UserVehicle.id == trip_data.vehicle_id,
            UserVehicle.user_id == user_id
        )
    ).first()
     
    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found or does not belong to you"
        )
     
    mpg = get_vehicle_mpg(vehicle, session)
    price_data = await get_fuel_price(state=user_state)
    fuel_price = price_data["price_per_gallon"]
    if trip_data.distance is None:
        assert trip_data.start_lat is not None
        assert trip_data.start_lng is not None
        assert trip_data.end_lat is not None
        assert trip_data.end_lng is not None
        trip_data.distance = haversine_distance(
            trip_data.start_lat,
            trip_data.start_lng,
            trip_data.end_lat,
            trip_data.end_lng
        )
        
    trip_calculation = calculate_trip_cost(trip_data.distance, mpg, fuel_price)
    
    trip = Trip(
        user_id=user_id,
        vehicle_id=trip_data.vehicle_id,
        start_location=trip_data.start_location,
        end_location=trip_data.end_location,
        distance=trip_data.distance,
        gallons_used=trip_calculation["gallons_used"],
        fuel_price=fuel_price,
        trip_cost=trip_calculation["trip_cost"],
        co2_kg=trip_calculation["co2_kg"],
        trip_date=trip_data.trip_date,
        tag=trip_data.tag,
        notes=trip_data.notes,
        # GPS coordinates, empty for now
        start_lat=trip_data.start_lat,
        end_lat=trip_data.end_lat,
        start_lng=trip_data.start_lng,
        end_lng=trip_data.end_lng,
        start_time=trip_data.start_time,
        end_time=trip_data.end_time
    )
    
    session.add(trip)
    session.commit()
    session.refresh(trip)
    
    return trip
    
    