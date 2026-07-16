import uuid
from fastapi import HTTPException
from datetime import datetime
from sqlmodel import Session, select, delete, col
from app.models.user import User
from app.models.trip import Trip
from app.models.vehicle_catalog import VehicleCatalog
from app.models.user_vehicle import UserVehicle
from app.schemas.vehicle import UserVehicleCreate, VehicleStats, UserVehicleUpdate

async def build_vehicle_stat(
    vehicle_id: uuid.UUID,
    user: User,
    session: Session
) -> VehicleStats:
    
    total_distance = 0
    total_fuel = 0
    total_cost = 0
    total_co2 = 0
    
    trips = list(session.exec(
        select(Trip).where(
            Trip.user_id==user.id,
            Trip.vehicle_id==vehicle_id
        )
    ).all())
    
    if not trips:
        return VehicleStats(
            total_trips=0,
            total_distance=total_distance,
            total_fuel=total_fuel,
            total_cost=total_cost,
            total_co2=total_co2
        )
        
    for trip in trips:
        if trip.distance is not None:
            total_distance+=trip.distance
        total_fuel+=trip.gallons_used
        total_cost+=trip.trip_cost
        total_co2+=trip.co2_kg
    
    return VehicleStats(
        total_trips=len(trips),
        total_distance=round(total_distance, 2),
        total_fuel=round(total_fuel, 2),
        total_cost=round(total_cost, 2),
        total_co2=round(total_co2, 2)
    )

def search_vehicle_from_db(
    make: str,
    model: str, 
    year: int,
    session: Session
) -> list[VehicleCatalog]:
    vehicle_list = list(session.exec(
        select(VehicleCatalog).where(
            col(VehicleCatalog.make).ilike(make),
            col(VehicleCatalog.model).ilike(f"%{model}%"),
            VehicleCatalog.year == year
        )
    ).all())
    
    if not vehicle_list:
        raise HTTPException(
            status_code=404,
            detail=f"{year} {make} {model} not found in vehicle catalog"
        )
    return vehicle_list

def get_all_years(
    session: Session
) -> list[int]:
    return list(session.exec(
        select(VehicleCatalog.year).distinct().order_by(col(VehicleCatalog.year).desc())
    ).all())
    
def get_makes_by_year(
    year: int,
    session: Session
) -> list[str]:
    return list(session.exec(
        select(VehicleCatalog.make).where(
            VehicleCatalog.year==year
        ).distinct().order_by(col(VehicleCatalog.make))
    ).all())

def get_models_by_year_make(
    year: int,
    make: str,
    session: Session
) -> list[str]:
    return list(session.exec(
        select(VehicleCatalog.model).where(
            VehicleCatalog.year==year,
            col(VehicleCatalog.make).ilike(make)
        ).distinct().order_by(col(VehicleCatalog.model))
    ).all())
    
async def add_user_vehicle(
    vehicle_data: UserVehicleCreate,
    user_id: uuid.UUID,
    session: Session
) -> dict:
    """Adds a vehicle to the user's garage."""
    if vehicle_data.is_default:
        existing_default = session.exec(
            select(UserVehicle). where(
                UserVehicle.user_id == user_id,
                UserVehicle.is_default == True
            )
        ).first()
        if existing_default:
            existing_default.is_default = False
            session.add(existing_default)
        
    user_vehicle = UserVehicle(
        user_id = user_id,
        catalog_id = vehicle_data.catalog_id,
        nickname = vehicle_data.nickname,
        make = vehicle_data.make,
        model = vehicle_data.model,
        year = vehicle_data.year,
        mpg_override = vehicle_data.mpg_override,
        is_default=vehicle_data.is_default,
        created_at=datetime.utcnow()
    )
    
    session.add(user_vehicle)
    session.commit()
    
    return {
        "id": user_vehicle.id,
        "user_id": user_vehicle.user_id,
        "catalog_id": user_vehicle.catalog_id,
        "nickname": user_vehicle.nickname,
        "make": user_vehicle.make,
        "model": user_vehicle.model,
        "year": user_vehicle.year,
        "mpg_override": user_vehicle.mpg_override,
        "is_default": user_vehicle.is_default,
        "created_at": user_vehicle.created_at
    }
    
def get_user_vehicles (
    user_id: uuid.UUID,
    session: Session
) -> list[UserVehicle]:
    """Returns all vehicls in the user's garage."""
    return list(session.exec(
        select(UserVehicle).where(UserVehicle.user_id==user_id)
    ).all())
    
def update_user_vehicle(
    vehicle_id: uuid.UUID,
    user_id: uuid.UUID,
    request: UserVehicleUpdate,
    session: Session
) -> UserVehicle:
    vehicle = session.exec(
        select(UserVehicle).where(
            UserVehicle.id == vehicle_id,
            UserVehicle.user_id == user_id
        )
    ).first()
    
    if vehicle is None:
        raise HTTPException(
            status_code=404, 
            detail="vehicle not found or does not belong to you"
        )
        
    if request.nickname is not None:
        vehicle.nickname = request.nickname
        
    if request.mpg_override is not None: 
        vehicle.mpg_override = request.mpg_override
        
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    
    return vehicle
    

def delete_user_vehicle(
    vehicle_id: uuid.UUID,
    user_id: uuid.UUID,
    session: Session 
) -> None:
    """Deletes a vehicle from the user's garage."""
    vehicle = session.exec(
        select(UserVehicle).where(
            UserVehicle.id == vehicle_id,
            UserVehicle.user_id == user_id
        )
    ).first()
    
    if vehicle is None:
        raise HTTPException(
            status_code=404, 
            detail="vehicle not found or does not belong to you"
        )
        
    trips = session.exec(
        select(Trip).where(
            Trip.vehicle_id==vehicle.id
        )
    ).all()
    
    session.exec(delete(Trip).where(col(Trip.vehicle_id)==vehicle.id))
    session.delete(vehicle)
    session.commit()
    