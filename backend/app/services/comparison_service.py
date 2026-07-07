from fastapi import HTTPException
from sqlmodel import Session, select
from app.models.user import User
from app.models.user_vehicle import UserVehicle
from app.models.vehicle_catalog import VehicleCatalog
from app.models.trip import Trip
from app.schemas.comparison import CompareRequest, VehicleComparisonResult
from app.services.calculation_service import calculate_trip_cost
from app.services.fuel_service import get_fuel_price

async def compare_vehicle(
    requests: CompareRequest,
    user: User,
    session: Session
) -> list[VehicleComparisonResult]:

    comparison_list = []
    
    user_default_vehicle = session.exec(
        select(UserVehicle).where(
            UserVehicle.user_id == user.id,
            UserVehicle.is_default == True
        )
    ).first()
    
    if user_default_vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )
        
    baseline_catalog = session.exec(
        select(VehicleCatalog).where(
            VehicleCatalog.id == user_default_vehicle.catalog_id
        )
    ).first()
    
    if baseline_catalog is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found in vehicle catalog"
        )
        
    trips = list(session.exec(
        select(Trip).where(
            Trip.vehicle_id == user_default_vehicle.id,
            Trip.user_id == user.id
        )
    ).all())
    
    total_distance = 0.0
    for trip in trips:
        if trip.distance is not None:
            total_distance += trip.distance
    total_trips = len(trips)
    
    baseline_mpg = baseline_catalog.combined_mpg
    if baseline_catalog.combined_mpg_alt is not None:
        baseline_mpg = baseline_catalog.combined_mpg_alt
    if user_default_vehicle.mpg_override is not None:
        baseline_mpg = user_default_vehicle.mpg_override
    if baseline_mpg is None:
        raise HTTPException(
            status_code=404,
            detail="No MPG information available to calculate trips cost"
        )
        
    baseline_result = await _build_result(
        catalog=baseline_catalog,
        mpg=baseline_mpg,
        total_distance=total_distance,
        total_trips=total_trips,
        is_baseline=True,
        baseline_cost=0,
        state=user.state,
        session=session
    )
    
    comparison_list.append(baseline_result)
    
    baseline_cost = baseline_result.total_cost
 
    for catalog_id in requests.vehicle_list: 
        selected_vehicle = session.exec(
            select(VehicleCatalog).where(
                VehicleCatalog.id == catalog_id
            )
        ).first()
        
        if selected_vehicle is None:
            raise HTTPException(
                status_code=404,
                detail="Vehicle not found in vehicle catalog"
            )
        
        mpg = selected_vehicle.combined_mpg       
        if selected_vehicle.combined_mpg_alt is not None:
            mpg = selected_vehicle.combined_mpg_alt
        if mpg is None:
            raise HTTPException(
                status_code=404,
                detail="No MPG information available to calculate trips cost"
            )
            
        result = await _build_result(
            catalog=selected_vehicle,
            mpg=mpg,
            total_distance=total_distance,
            total_trips=total_trips,
            is_baseline=False,
            baseline_cost=baseline_cost,
            state=user.state,
            session=session
        )
            
        comparison_list.append(result)
            
    return comparison_list
    
async def _build_result(catalog, mpg, total_distance, total_trips, is_baseline, baseline_cost, state, session):
    fuel_type = catalog.fuel_type or "Regular Gasoline"
    
    if total_distance > 0:
        price_data = await get_fuel_price(fuel_type, state)
        calc = calculate_trip_cost(total_distance, mpg, price_data["price"], fuel_type)
        total_cost = calc["trip_cost"]
        total_gallons = calc["gallons_used"]
        total_co2 = calc["co2_kg"]
    else:
        total_cost = 0.0
        total_gallons = 0.0
        total_co2 = 0.0

    savings = None if is_baseline else round(baseline_cost - total_cost, 2)
    return VehicleComparisonResult(
        total_trips=total_trips,
        total_distance=total_distance,
        total_cost=total_cost,
        total_gallons=total_gallons,
        total_co2_kg=total_co2,
        estimated_savings=savings,
        is_baseline=is_baseline,
        catalog_id=catalog.id,
        make=catalog.make,
        model=catalog.model,
        year=catalog.year,
        description=catalog.description,
        drive=catalog.drive,
        cylinders=catalog.cylinders,
        displacement=catalog.displacement,
        vehicle_class=catalog.vehicle_class,
        atv_type=catalog.atv_type,
        fuel_type=catalog.fuel_type,
        city_mpg=catalog.city_mpg,
        highway_mpg=catalog.highway_mpg,
        combined_mpg=catalog.combined_mpg,
        fuel_type_2=catalog.fuel_type_2,
        city_mpg_alt=catalog.city_mpg_alt,
        highway_mpg_alt=catalog.highway_mpg_alt,
        combined_mpg_alt=catalog.combined_mpg_alt
    )
    