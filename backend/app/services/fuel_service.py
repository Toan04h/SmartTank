import httpx
from app.core.config import settings

EIA_BASE_URL = "https://api.eia.gov/v2"

async def get_national_fuel_price() -> dict: 
    """
    Fetch the lastest national average regular gasoline price from the EIA API.
    Returns price in dollars per gallon
    """
    url = f"{EIA_BASE_URL}/petroleum/pri/gnd/data/"
    params = {
        "api_key": settings.EIA_API_KEY,
        "frequency": "weekly",
        "data[0]": "value",
        "facets[product][]": "EPM0",
        "facets[duoarea][]": "NUS",
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "length": 1,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    latest = data["response"]["data"][0]
        
    return {
        "price_per_gallon": float(latest["value"]),
        "period": latest["period"],
        "unit": "dollars per gallon",
        "area": "National Average (US)",
    }
    