from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    EIA_API_KEY: str
    APP_ENV: str = "development"
    SECRET_KEY: str
    
    class Config: 
        env_file = ".env"

settings = Settings() # type: ignore
