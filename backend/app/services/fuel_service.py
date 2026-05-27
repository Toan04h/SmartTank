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

async def get_fuel_price(state: Optional[str] = None) -> dict: 
    """
    Fetch the lastest national average regular gasoline price from the EIA API.
    Returns price in dollars per gallon
    """
    url = f"{EIA_BASE_URL}/petroleum/pri/gnd/data/"
    is_estimate = True
    area_code = "NUS"
    notice = "Set your state in profile settings for more accurate local prices"
    
    if state and STATE_TO_EIA.get(state.upper()):
        area_code = STATE_TO_EIA[state.upper()]
        is_estimate = False
        notice = None
        
    params = {
        "api_key": settings.EIA_API_KEY,
        "frequency": "weekly",
        "data[0]": "value",
        "facets[product][]": "EPM0",
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
        is_estimate = True
        notice = f"No state-level data available for {state} - using national average"
        
        params["facets[duoarea][]"] = "NUS"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
    latest = data["response"]["data"][0]
        
    return {
        "price_per_gallon": float(latest["value"]),
        "period": latest["period"],
        "unit": "dollars per gallon",
        "area": f"{state} State Average" if not is_estimate else "National Average (US)",
        "notice": notice
    }
    