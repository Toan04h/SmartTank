import calendar
from sqlmodel import Session, select, between
from app.models.user import User
from app.models.trip import Trip
from app.models.user_vehicle import UserVehicle
from app.schemas.dashboard import DashboardStats
from app.schemas.vehicle import UserVehicleResponse
from app.schemas.trip_log import TripResponse
from datetime import datetime

async def build_dashboard(
    user: User,
    session: Session
) -> DashboardStats:
    
    user_default_vehicle = session.exec(
        select(UserVehicle).where(
            UserVehicle.user_id==user.id,
            UserVehicle.is_default==True
        )
    ).first()

    default_vehicle = UserVehicleResponse.model_validate(user_default_vehicle) if user_default_vehicle else None
    
    month = datetime.now().month
    year = datetime.now().year
    
    start_of_month = datetime(year, month, 1, 0, 0, 0)
    _, total_days = calendar.monthrange(year, month)
    end_of_month = datetime(year, month, total_days, 23, 59, 59)
    
    trips = list(session.exec(
        select(Trip). where(
            between(Trip.created_at, start_of_month, end_of_month)
        )
    ).all())
    
    total_distance=0.0
    total_fuel=0
    total_cost=0
    total_co2=0
    recent_trips=[]
    
    if not trips: 
        return DashboardStats(
            total_trips=0,
            total_distance=total_distance,
            total_fuel=total_fuel,
            total_cost=total_cost,
            total_co2=total_co2,
            recent_trips=recent_trips,
            default_vehicle=default_vehicle
        ) 
    
    for trip in trips: 
        if trip.distance is not None:
            total_distance+=trip.distance
        total_fuel+=trip.gallons_used
        total_cost+=trip.trip_cost
        total_co2+=trip.co2_kg
    
    sorted_trips = sorted(trips, key=lambda t: t.created_at, reverse=True)[:5]
    
    for trip in sorted_trips:
        recent_trips.append(TripResponse.model_validate(trip))
    
    return DashboardStats(
        total_trips=len(trips),
        total_distance=round(total_distance, 2),
        total_fuel=round(total_fuel, 2),
        total_cost=round(total_cost, 2),
        total_co2=round(total_co2, 2),
        recent_trips=recent_trips,
        default_vehicle=default_vehicle
    )   
        
        
    
    