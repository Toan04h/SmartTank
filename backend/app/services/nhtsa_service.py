from fastapi import HTTPException
import httpx

EPA_HEADERS = {"Accept": "application/json"}
EPA_BASE_URL = "https://www.fueleconomy.gov/ws/rest/vehicle"
NHTSA_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear"

async def search_vehicle(make: str, model: str, year: int) -> dict:
    """
    Searches NHTSA for vehicle existence then EPA for MPG data.
    Returns combined vehicle information.
    """
    async with httpx.AsyncClient() as client:
        matched = await _validate_nhtsa(make, model, year, client)
        menu_items = await _get_epa_menu(make, model, year, client)
    
        vehicle_id = menu_items[0]["value"]
        response = await client.get(
            f"{EPA_BASE_URL}/{vehicle_id}",
            headers=EPA_HEADERS
        )
        response.raise_for_status()
        vehicle_data = response.json()
    
    return {
        "make": make,
        "model": model,
        "year": year,
        "description": menu_items[0]["text"],
        "nhtsa_vehicle_id": str(matched.get("Model_ID")),
        "fuel_type": vehicle_data.get("fuelType1"),
        "city_mpg": vehicle_data.get("city08"),
        "highway_mpg": vehicle_data.get("highway08"),
        "combined_mpg": vehicle_data.get("comb08")
    }
    
async def get_vehicle_options(make: str, model: str, year: int) -> list[dict]:
    """
    Returns all EPA engine configurations for a given make/model/year.
    Each option represents a specific engine/transmission combination with MPG data.
    """
    async with httpx.AsyncClient() as client:
        matched = await _validate_nhtsa(make, model, year, client)
        confirmed_model = matched["Model_Name"]
        menu_items = await _get_epa_menu(make, model, year, client)
       
        vehicle_options = []

        for item in menu_items:
            vehicle_id = item["value"]
            description = item["text"]
            
            response = await client.get(
                f"{EPA_BASE_URL}/{vehicle_id}",
                headers=EPA_HEADERS
            )
            response.raise_for_status()
            data = response.json()
            print(f"Vehicle ID: {vehicle_id}")
            print(f"Data: {data}")
            
            vehicle_options.append({
                "epa_vehicle_id": vehicle_id,
                "description": description,
                "make": make,
                "model": confirmed_model,
                "year": year,
                "city_mpg": float(data.get("city08", 0) or 0),
                "highway_mpg": float(data.get("highway08", 0) or 0),
                "combined_mpg": float(data.get("comb08", 0) or 0),
                "fuel_type": data.get("fuelType1"),
                "nhtsa_vehicle_id": str(matched.get("Model_ID"))
            })
    
    return vehicle_options
        
async def _validate_nhtsa(make: str, model: str, year: int, client: httpx.AsyncClient) -> dict: 
    """Validates vehicle exists in NHTSA and returns matched result"""    
    response = await client.get(
        f"{NHTSA_BASE_URL}/make/{make}/modelyear/{year}?format=json"
    )
    response.raise_for_status()
    nhtsa_data = response.json()
        
    results = nhtsa_data.get("Results", [])
    matches = [
        r for r in results 
        if r["Model_Name"].lower() in model.lower() 
        or model.lower() in r["Model_Name"].lower()
    ]   
    
    if matches is None:
        raise HTTPException(
            status_code=404,
            detail=f"{year} {make} {model} not found in NHTSA database"
        )
        
    return matches[0]

async def _get_epa_menu(make: str, model: str, year: int, client: httpx.AsyncClient) -> list:
    """Returns all EPA engine configuration options for a vehicle"""
    response = await client.get(
        f"{EPA_BASE_URL}/menu/options",
        params={"year": year, "make": make, "model": model},
        headers=EPA_HEADERS
    )
    response.raise_for_status()
    epa_menu = response.json()
    
    if epa_menu is None:
        raise HTTPException(
            status_code=404,
            detail=f"No EPA fuel economy data found for {year} {make} {model} — try a different year"
        )
    
    menu_items = epa_menu.get("menuItem", [])
    
    if isinstance(menu_items, dict):
        menu_items = [menu_items]
  
    if not menu_items:
        raise HTTPException(
            status_code=404,
            detail=f"No EPA fuel economy data found for {year} {make} {model}"
        )
        
    return menu_items