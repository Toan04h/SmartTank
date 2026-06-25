import httpx
from app.core.config import settings

async def autocomplete_address(
    input: str,
    lat: float | None = None,
    lng: float | None = None
) -> list[dict]:
    async with httpx.AsyncClient() as client:
        json_body: dict={
                "input": input,
                "languageCode": "en"
            }
            
        if lat is not None and lng is not None:
            json_body["locationBias"] = {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": 50000.0  # 50km radius
                }
            }
            
        response = await client.post(
            "https://places.googleapis.com/v1/places:autocomplete",
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": settings.GOOGLE_SERVICES_API_KEY,
            },     
            json=json_body
        )
        response.raise_for_status()
        data = response.json()

        return [
            {
                "description": s["placePrediction"]["text"]["text"],
                "place_id": s["placePrediction"]["placeId"]
            }
            for s in data.get("suggestions", [])
        ]
        
        
async def geocode_place(place_id: str) -> dict:  
    async with httpx.AsyncClient() as client: 
        response = await client.get(
            f"https://places.googleapis.com/v1/places/{place_id}",
            headers={
                "X-Goog-Api-Key": settings.GOOGLE_SERVICES_API_KEY,
                "X-Goog-FieldMask": "location,formattedAddress" 
            }
        )
        
        response.raise_for_status()
        data = response.json()
            
        return {
            "lat": data["location"]["latitude"],
            "lng": data["location"]["longitude"],
            "formatted_address": data["formattedAddress"]
        }
        
async def reverse_geocode(lat: float, lng: float) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={
                "latlng": f"{lat},{lng}",
                "key": settings.GOOGLE_SERVICES_API_KEY
            }
        )
        
        response.raise_for_status()
        data = response.json()
        
        return {
            "formatted_address": data["results"][0]["formatted_address"]
        }