from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import maps, fuel, trips, auth, trip_log, vehicles, users

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

app = FastAPI(
    title="SmartTank API",
    description="Fuel tracking and route optimization backend",
    version="0.1.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler) # type: ignore

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://smart-tank.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(maps.router)
app.include_router(fuel.router)
app.include_router(trips.router)
app.include_router(auth.router)
app.include_router(trip_log.router)
app.include_router(vehicles.router)

@app.get("/")
def root():
    return {"message": "SmartTank API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}