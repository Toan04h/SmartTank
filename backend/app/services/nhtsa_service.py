from fastapi import HTTPException
import httpx
from app.core.config import settings

EPA_HEADERS = {"Accept": "application/json"}

async def search_vehicle(make: str, model: str, year: int) -> dict:
    """
    Searches NHTSA for vehicle existence then EPA for MPG data.
    Returns combined vehicle information.
    """
    nhtsa_url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(nhtsa_url)
        response.raise_for_status()
        nhtsa_data = response.json()
        
    results = nhtsa_data.get("Results", [])
    matched = next(
        (r for r in results if r["Model_Name"].lower() == model.lower()),
        None
    )
    
    if matched is None:
        raise HTTPException(
            status_code=404,
            detail=f"{year} {make} {model} not found in NHTSA database"
        )
        
    epa_url = f"https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year={year}&make={make}&model={model}"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            epa_url,
            params={"year": year, "make": make, "model": model},
            headers=EPA_HEADERS
        )
        response.raise_for_status()
        epa_menu = response.json()
    
    menu_items = epa_menu.get("menuItem", [])
    if not menu_items:
        return {
            "make": make,
            "model": model,
            "year": year,
            "nhtsa_vehicle_id": str(matched.get("Model_ID")),
            "fuel_type": None,
            "city_mpg": None,
            "highay_mpg": None,
            "combined_mpg": None
        }
    
    vehicle_id = menu_items[0]["value"]
    
    vehicle_url = f"https://www.fueleconomy.gov/ws/rest/vehicle/{vehicle_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            vehicle_url,
            headers=EPA_HEADERS
        )
        response.raise_for_status()
        vehicle_data = response.json()
    
    return {
        "make": make,
        "model": model,
        "year": year,
        "nhtsa_vehicle_id": str(matched.get("Model_ID")),
        "fuel_type": vehicle_data.get("fuelType1"),
        "city_mpg": vehicle_data.get("city08"),
        "highway_mpg": vehicle_data.get("highway08"),
        "combined_mpg": vehicle_data.get("comb08")
    }
    
    
    
    