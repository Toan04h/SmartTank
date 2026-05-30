from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import fuel, trips, auth, trip_log, vehicles, users
from app.core.database import init_db

app = FastAPI(
    title="SmartTank API",
    description="Fuel tracking and route optimization backend",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://smart-tank-vercel-app.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(users.router)
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