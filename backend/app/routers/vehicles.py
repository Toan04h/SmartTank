import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.schemas.vehicle import (
    AddVehicleRequest, VehicleOptionSelected, 
    UserVehicleCreate, UserVehicleResponse, 
    VehicleSearchRequest, VehicleSearchResponse
)
from app.services.vehicle_service import cache_vehicle_option, delete_user_vehicle, add_user_vehicle, get_user_vehicles
from app.services.nhtsa_service import get_vehicle_options
from app.models.user import User
from app.models.user_vehicle import UserVehicle
from app.core.dependencies import get_current_user
from app.core.database import get_session

router = APIRouter(
    prefix="/vehicles",
    tags=["vehicles"]
)

@router.post("/search", response_model=list[VehicleSearchResponse])
async def vehicle_search(
    request: VehicleSearchRequest
):
    try:
        result = await get_vehicle_options(
            request.make, 
            request.model, 
            request.year 
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@router.post("", response_model=UserVehicleResponse, status_code=201)
async def add_vehicle(
    request: AddVehicleRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try: 
        vehicle_option = VehicleOptionSelected(
            epa_vehicle_id=request.epa_vehicle_id,
            description=request.description,
            make=request.make,
            model=request.model,
            year=request.year,
            fuel_type=request.fuel_type,
            city_mpg=request.city_mpg,
            highway_mpg=request.highway_mpg,
            combined_mpg=request.combined_mpg,
            nhtsa_vehicle_id=request.nhtsa_vehicle_id
        )
        catalog_entry = await cache_vehicle_option(vehicle_option, session)
        
        garage_data = UserVehicleCreate(
            catalog_id=catalog_entry.id,
            nickname=request.nickname,
            make=request.make,
            model=request.model,
            year=request.year,
            mpg_override=request.mpg_override,
            is_default=request.is_default
        )
        
        return await add_user_vehicle(garage_data, user.id, session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/garage", response_model=list[UserVehicleResponse])
async def user_vehicles(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return get_user_vehicles(user.id, session)

@router.patch("/{vehicle_id}/default", response_model=UserVehicleResponse)
async def set_default_vehicle(
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    existing_default = session.exec(
        select(UserVehicle).where(
            UserVehicle.user_id == user.id,
            UserVehicle.is_default == True
        )
    ).first()
    if existing_default:
        existing_default.is_default = False
        session.add(existing_default)
        
    new_default = session.exec(
        select(UserVehicle).where(
            UserVehicle.id == vehicle_id,
            UserVehicle.user_id == user.id
        )
    ).first()
    
    if new_default is None: 
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found or does not belong to you"
        )
        
    new_default.is_default = True
    session.add(new_default)
    session.commit()
    session.refresh(new_default)
    
    return new_default    

@router.delete("/{vehicle_id}", status_code=204)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return delete_user_vehicle(vehicle_id, user.id, session)
