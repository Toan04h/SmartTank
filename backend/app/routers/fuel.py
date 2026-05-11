from fastapi import APIRouter, HTTPException
from app.services.fuel_service import get_national_fuel_price

router = APIRouter(
    prefix="/fuel",
    tags=["fuel"]
)

@router.get("/price")
async def get_fuel_price():
    try:
        data = await get_national_fuel_price()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))