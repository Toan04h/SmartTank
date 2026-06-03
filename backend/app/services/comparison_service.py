import uuid
from fastapi import HTTPException
from sqlmodel import Session, select
from app.models.user import User
from app.models.user_vehicle import UserVehicle
from app.models.vehicle_catalog import VehicleCatalog
from app.models.trip import Trip
from app.schemas.comparison import CompareRequest, VehicleComparisonResult
from app.services.calculation_service import calculate_trip_cost

async def compare_vehicle(
    requests: CompareRequest,
    user: User,
    session: Session
) -> list[VehicleComparisonResult]:

    comparison_list = []
    print("Fetching default vehicle...")
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
        
    print("Fetching catalog...")
    user_vehicle_catalog = session.exec(
        select(VehicleCatalog).where(
            VehicleCatalog.id == user_default_vehicle.catalog_id
        )
    ).first()
    
    if user_vehicle_catalog is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found in vehicle catalog"
        )
        
    print("Fetching trips...")
    trips = list(session.exec(
        select(Trip).where(
            Trip.vehicle_id == user_default_vehicle.id,
            Trip.user_id == user.id
        )
    ).all())
    
    default_mpg = user_vehicle_catalog.combined_mpg
        
    if user_vehicle_catalog.combined_mpg_alt is not None:
        default_mpg = user_vehicle_catalog.combined_mpg_alt
    
    if user_default_vehicle.mpg_override is not None:
        default_mpg = user_default_vehicle.mpg_override
        
    if default_mpg is None:
        raise HTTPException(
            status_code=404,
            detail="No MPG information available to calculate trips cost"
        )
    print("Done fetching")    
    baseline_total_cost = 0
    total_gallons = 0
    total_co2 = 0
    total_distance = 0
        
    print("Fetching trips...")
    for trip in trips:
        if trip.distance is None:
            continue
        result = calculate_trip_cost(trip.distance, default_mpg, trip.fuel_price)
        baseline_total_cost += result["trip_cost"]
        total_gallons += result["gallons_used"]
        total_co2 += result["co2_kg"]
        total_distance += trip.distance
            
    vehicle_result = VehicleComparisonResult(
        total_trips=len(trips),
        total_distance=total_distance,
        total_cost=baseline_total_cost,
        total_gallons=total_gallons,
        total_co2_kg=total_co2,
        estimated_savings=None,
        is_baseline=True,
        catalog_id=user_vehicle_catalog.id,
        make=user_vehicle_catalog.make,
        model=user_vehicle_catalog.model,
        year=user_vehicle_catalog.year,
        description=user_vehicle_catalog.description,
        drive=user_vehicle_catalog.drive,
        cylinders=user_vehicle_catalog.cylinders,
        displacement=user_vehicle_catalog.displacement,
        vehicle_class=user_vehicle_catalog.vehicle_class,
        atv_type=user_vehicle_catalog.atv_type,
        fuel_type=user_vehicle_catalog.fuel_type,
        city_mpg=user_vehicle_catalog.city_mpg,
        highway_mpg=user_vehicle_catalog.highway_mpg,
        combined_mpg=user_vehicle_catalog.combined_mpg,
        fuel_type_2=user_vehicle_catalog.fuel_type_2,
        city_mpg_alt=user_vehicle_catalog.city_mpg_alt,
        highway_mpg_alt=user_vehicle_catalog.highway_mpg_alt,
        combined_mpg_alt=user_vehicle_catalog.combined_mpg_alt
    )
    
    comparison_list.append(vehicle_result)
    
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
            
        total_cost = 0
        total_gallons = 0
        total_co2 = 0
        total_distance = 0
        
        mpg = selected_vehicle.combined_mpg
        
        if selected_vehicle.combined_mpg_alt is not None:
            mpg = selected_vehicle.combined_mpg_alt
            
        if mpg is None:
            raise HTTPException(
                status_code=404,
                detail="No MPG information available to calculate trips cost"
            )
            
        for trip in trips:
            if trip.distance is None:
                continue
            result = calculate_trip_cost(trip.distance, mpg, trip.fuel_price)
            total_cost += result["trip_cost"]
            total_gallons += result["gallons_used"]
            total_co2 += result["co2_kg"]
            total_distance += trip.distance
            
        vehicle_result = VehicleComparisonResult(
            total_trips=len(trips),
            total_distance=total_distance,
            total_cost=total_cost,
            total_gallons=total_gallons,
            total_co2_kg=total_co2,
            estimated_savings=round(baseline_total_cost - total_cost, 2),
            is_baseline=False,
            catalog_id=selected_vehicle.id,
            make=selected_vehicle.make,
            model=selected_vehicle.model,
            year=selected_vehicle.year,
            description=selected_vehicle.description,
            drive=selected_vehicle.drive,
            cylinders=selected_vehicle.cylinders,
            displacement=selected_vehicle.displacement,
            vehicle_class=selected_vehicle.vehicle_class,
            atv_type=selected_vehicle.atv_type,
            fuel_type=selected_vehicle.fuel_type,
            city_mpg=selected_vehicle.city_mpg,
            highway_mpg=selected_vehicle.highway_mpg,
            combined_mpg=selected_vehicle.combined_mpg,
            fuel_type_2=selected_vehicle.fuel_type_2,
            city_mpg_alt=selected_vehicle.city_mpg_alt,
            highway_mpg_alt=selected_vehicle.highway_mpg_alt,
            combined_mpg_alt=selected_vehicle.combined_mpg_alt
        )
        
        comparison_list.append(vehicle_result)
            
    return comparison_list
    
    
    
        
    