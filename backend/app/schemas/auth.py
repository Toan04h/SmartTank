from pydantic import BaseModel, Field, EmailStr
from typing_extensions import Annotated

class UserRegister(BaseModel): 
    email: EmailStr
    password: Annotated[str, Field(min_length=8, max_length=72)]
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = Field(default="bearer")