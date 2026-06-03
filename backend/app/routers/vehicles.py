import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.schemas.vehicle import ( 
    UserVehicleCreate, UserVehicleResponse, 
    VehicleSearchRequest, VehicleSearchResponse,
    AddVehicleRequest
)
from app.schemas.comparison import (
    VehicleComparisonResult, CompareRequest
)
from app.services.vehicle_service import (
    search_vehicle_from_db, delete_user_vehicle, 
    add_user_vehicle, get_user_vehicles
)
from app.services.comparison_service import (
    compare_vehicle
)
from app.models.user import User
from app.models.user_vehicle import UserVehicle
from app.models.vehicle_catalog import VehicleCatalog
from app.core.dependencies import get_current_user
from app.core.database import get_session

router = APIRouter(
    prefix="/vehicles",
    tags=["vehicles"]
)

@router.post("/compare", response_model=list[VehicleComparisonResult])
async def compare_vehicles(
    request: CompareRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        return await compare_vehicle(request, user, session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=list[VehicleSearchResponse])
async def vehicle_search(
    request: VehicleSearchRequest,
    session: Session = Depends(get_session)
):
    try:
        return search_vehicle_from_db(
            request.make, 
            request.model, 
            request.year,
            session
        )
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
        catalog = session.get(VehicleCatalog, request.catalog_id)
        if catalog is None:
            raise HTTPException(
                status_code=404,
                detail="Vehicle not found in catalog"
            )
            
        garage_data = UserVehicleCreate(
            catalog_id=request.catalog_id,
            nickname=request.nickname,
            make=catalog.make,
            model=catalog.model,
            year=catalog.year,
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

