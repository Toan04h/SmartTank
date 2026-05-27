from fastapi import APIRouter, HTTPException
from app.services.fuel_service import get_fuel_price

router = APIRouter(
    prefix="/fuel",
    tags=["fuel"]
)

@router.get("/price")
async def fuel_price_endpoint():
    try:
        data = await get_fuel_price()
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))