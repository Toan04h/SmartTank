import uuid
from pydantic import BaseModel, Field, EmailStr
from typing_extensions import Annotated
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel): 
    email: EmailStr
    password: Annotated[str, Field(min_length=8, max_length=72)]
    full_name: Optional[str] = None
    state: Optional[str] = Field(default=None, min_length=2, max_length=5)
    zip_code: Optional[str] = Field(default=None, min_length=5, max_length=10)
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    state: Optional[str] = Field(default=None, min_length=2, max_length=2)
    zip_code: Optional[str] = Field(default=None, min_length=5, max_length=10)
    
class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    created_at: datetime
    
class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)
    
class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = Field(default="bearer")
    
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = Field(default="bearer")
    
class RefreshRequest(BaseModel):
    refresh_token: str
    
