import uuid
from fastapi import HTTPException
from datetime import datetime
from sqlmodel import Session, select
from app.models.vehicle_catalog import VehicleCatalog
from app.models.user_vehicle import UserVehicle
from app.schemas.vehicle import UserVehicleCreate, VehicleOptionSelected

async def cache_vehicle_option(
                            vehicle_option: VehicleOptionSelected, 
                            session: Session
) -> VehicleCatalog:
    """Search NHTSA for vehicle, caches in catalog if not already there."""
    vehicle_catalog = session.exec(
        select(VehicleCatalog).where(
            VehicleCatalog.epa_vehicle_id==vehicle_option.epa_vehicle_id         
        )
    ).first()
    
    if vehicle_catalog is None:
        vehicle_catalog = VehicleCatalog(
            epa_vehicle_id=vehicle_option.epa_vehicle_id,
            description=vehicle_option.description,
            make=vehicle_option.make,
            model=vehicle_option.model,
            year=vehicle_option.year,
            fuel_type=vehicle_option.fuel_type,
            city_mpg=vehicle_option.city_mpg,
            highway_mpg=vehicle_option.highway_mpg,
            combined_mpg=vehicle_option.combined_mpg,
            nhtsa_vehicle_id=vehicle_option.nhtsa_vehicle_id
        )
        session.add(vehicle_catalog)
        session.commit()
        session.refresh(vehicle_catalog)
        
    return vehicle_catalog
    
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
        is_default=True,
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
        
    session.delete(vehicle)
    session.commit()
    