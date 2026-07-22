import asyncio
import logging
from fastapi import APIRouter, HTTPException, Depends
from app.models.user import User
from app.services.fuel_service import get_fuel_price
from app.core.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/fuel",
    tags=["fuel"]
)

@router.get("/price")
async def fuel_price_endpoint(
    current_user: User = Depends(get_current_user)
):
    """Returns current gasoline, diesel, and electricity prices, all fetched concurrently."""
    try:
        gas, diesel, electricity = await asyncio.gather(
            get_fuel_price("Regular Gasoline"),
            get_fuel_price("Diesel"),
            get_fuel_price("Electricity")
        )
        return {
            "gasoline": gas,
            "diesel": diesel,
            "electricity": electricity
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to fetch fuel prices")
        raise HTTPException(status_code=500, detail="Internal server error")