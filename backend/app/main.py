from fastapi import FastAPI

app = FastAPI(
    title="SmartTank API",
    description="Fuel tracking and route optimization backend",
    version="0.1.0"
)


@app.get("/")
def root():
    return {"message": "SmartTank API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}