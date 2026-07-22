import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.schemas.vehicle import ( 
    UserVehicleCreate, UserVehicleResponse, 
    VehicleSearchRequest, VehicleSearchResponse,
    AddVehicleRequest, VehicleStats, UserVehicleUpdate
)
from app.schemas.comparison import (
    VehicleComparisonResult, CompareRequest
)
from app.services.vehicle_service import (
    search_vehicle_from_db, delete_user_vehicle, 
    update_user_vehicle, add_user_vehicle, 
    get_user_vehicles, build_vehicle_stat,
    get_all_years, get_makes_by_year,
    get_models_by_year_make
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

@router.get("/years", response_model=list[int])
async def vehicle_years(
    session: Session = Depends(get_session)
):
    """Lists all distinct model years present in the vehicle catalog, newest first."""
    return get_all_years(session)

@router.get("/makes", response_model=list[str])
async def vehicle_makes(
    year: int,
    session: Session = Depends(get_session)
):
    """Lists distinct makes available for a given model year."""
    return get_makes_by_year(year, session)

@router.get("/models", response_model=list[str])
async def vehicle_models(
    year: int,
    make: str,
    session: Session = Depends(get_session)
):
    """Lists distinct models available for a given year and make."""
    return get_models_by_year_make(year, make, session)

@router.post("/compare", response_model=list[VehicleComparisonResult])
async def compare_vehicles(
    request: CompareRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Compares up to 4 catalog vehicles against the user's default vehicle,
    projecting cost/CO2 using the user's actual trip history."""
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
    """Searches the EPA vehicle catalog by make, model, and year (case-insensitive, partial model match)."""
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
    """Adds a catalog vehicle to the user's garage. MPG resolves as
    override > alt-fuel combined MPG > combined MPG. Setting is_default
    unsets any previously default vehicle."""
    try:
        catalog = session.get(VehicleCatalog, request.catalog_id)
        if catalog is None:
            raise HTTPException(
                status_code=404,
                detail="Vehicle not found in catalog"
            )
        
        mpg = catalog.combined_mpg
        
        if catalog.combined_mpg_alt is not None: 
            mpg = catalog.combined_mpg_alt
            
        if request.mpg_override is not None:
            mpg =  request.mpg_override
            
        garage_data = UserVehicleCreate(
            catalog_id=request.catalog_id,
            nickname=request.nickname,
            make=catalog.make,
            model=catalog.model,
            year=catalog.year,
            mpg_override=mpg,
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
    """Lists every vehicle in the authenticated user's garage."""
    return get_user_vehicles(user.id, session)

@router.get("/{vehicle_id}/stats", response_model=VehicleStats)
async def get_vehicle_stats(
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Returns lifetime trip stats (distance, fuel, cost, CO2) for one garage vehicle."""
    try:
        return await build_vehicle_stat(vehicle_id, user, session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{vehicle_id}/default", response_model=UserVehicleResponse)
async def set_default_vehicle(
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Sets a garage vehicle as the user's default, unsetting any previous one.
    A user has at most one default vehicle at a time."""
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

@router.patch("/{vehicle_id}", response_model=UserVehicleResponse)
async def edit_vehicle(
    request: UserVehicleUpdate,
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Partially updates a garage vehicle's nickname or MPG override. Omitted fields are left unchanged."""
    return update_user_vehicle(vehicle_id, user.id, request, session)

@router.delete("/{vehicle_id}", status_code=204)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Removes a vehicle from the user's garage. Also deletes every trip logged against it."""
    return delete_user_vehicle(vehicle_id, user.id, session)

