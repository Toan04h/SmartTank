from pydantic import BaseModel, Field, EmailStr

class UserRegister(BaseModel): 
    email: EmailStr
    password: str = Field(min_length=8)
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = Field(default="bearer")