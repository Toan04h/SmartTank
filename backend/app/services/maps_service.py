import httpx
from app.core.config import settings
from typing import Optional

async def autocomplete_address(input: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://places.googleapis.com/v1/places:autocomplete",
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": settings.GOOGLE_SERVICES_API_KEY,
            },
            json={
                "input": input,
                "languageCode": "en"
            }
        )
        response.raise_for_status()
        data = response.json()
        print(data)

        
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
        print(data)
            
        return {
            "lat": data["location"]["latitude"],
            "lng": data["location"]["longitude"],
            "formatted_address": data["formattedAddress"]
        }