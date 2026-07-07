import httpx
from app.core.config import settings
from typing import Optional

EIA_BASE_URL = "https://api.eia.gov/v2"

# EIA state code mapping
STATE_TO_EIA = {
    "AL": "SAL", "AK": "SAK", "AZ": "SAZ", "AR": "SAR",
    "CA": "SCA", "CO": "SCO", "CT": "SCT", "DE": "SDE",
    "FL": "SFL", "GA": "SGA", "HI": "SHI", "ID": "SID",
    "IL": "SIL", "IN": "SIN", "IA": "SIA", "KS": "SKS",
    "KY": "SKY", "LA": "SLA", "ME": "SME", "MD": "SMD",
    "MA": "SMA", "MI": "SMI", "MN": "SMN", "MS": "SMS",
    "MO": "SMO", "MT": "SMT", "NE": "SNE", "NV": "SNV",
    "NH": "SNH", "NJ": "SNJ", "NM": "SNM", "NY": "SNY",
    "NC": "SNC", "ND": "SND", "OH": "SOH", "OK": "SOK",
    "OR": "SOR", "PA": "SPA", "RI": "SRI", "SC": "SSC",
    "SD": "SSD", "TN": "STN", "TX": "STX", "UT": "SUT",
    "VT": "SVT", "VA": "SVA", "WA": "SWA", "WV": "SWV",
    "WI": "SWI", "WY": "SWY", "DC": "SDC"
}

async def get_fuel_price(fuel_type: str, state: Optional[str] = None) -> dict: 
    gasoline_types = {"Regular Gasoline", "Midgrade Gasoline", "Premium Gasoline"}

    if fuel_type in gasoline_types:
        price = await _get_petroleum_price("EPM0", state)
        unit = "dollars per gallon"
    elif fuel_type == "Diesel": 
        price = await _get_petroleum_price("EPD2D", state)
        unit = "dollars per gallon"
    elif fuel_type == "Electricity":
        price = await _get_electricity_price(state)
        unit = "dollars per kWh"
    else: 
        price = await _get_petroleum_price("EPM0", state)
        unit = "dollars per gallon"
    
    return {
        "price": price,
        "unit": unit,
        "fuel_type": fuel_type
    }
    
async def _get_petroleum_price(product_code:str, state: Optional[str] = None) -> float:
    """
    Fetch the lastest national average regular gasoline price from the EIA API.
    Returns price in dollars per gallon
    """
    url = f"{EIA_BASE_URL}/petroleum/pri/gnd/data/"
    area_code = "NUS"
    
    if state and STATE_TO_EIA.get(state.upper()):
        area_code = STATE_TO_EIA[state.upper()]
        
    params = {
        "api_key": settings.EIA_API_KEY,
        "frequency": "weekly",
        "data[0]": "value",
        "facets[product][]": product_code,
        "facets[duoarea][]": area_code,
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "length": 1,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    if not data["response"]["data"]:
        area_code = "NUS"
        
        params["facets[duoarea][]"] = "NUS"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
    latest = data["response"]["data"][0]
    
    return float(latest["value"])

async def _get_electricity_price(state: Optional[str] = None) -> float: 
    url = f"{EIA_BASE_URL}/electricity/retail-sales/data/"
    area_code = "US"
    
    if state:
        area_code = state.upper()
        
    params = {
        "api_key": settings.EIA_API_KEY,
        "frequency": "monthly",
        "data[0]": "price",
        "facets[sectorid][]": "RES",
        "facets[stateid][]": area_code,
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "length": 1,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
    if not data["response"]["data"]:
        params["facets[stateid][]"] = "US"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
    latest = data["response"]["data"][0]

    return float(latest["price"])/100
