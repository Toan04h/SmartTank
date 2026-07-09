from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    EIA_API_KEY: str
    APP_ENV: str = "development"
    SECRET_KEY: str
    GOOGLE_SERVICES_API_KEY: str
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_S3_BUCKET: str
    AWS_S3_REGION: str
    
    
    class Config: 
        env_file = ".env"

settings = Settings() # type: ignore
