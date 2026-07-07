import secrets
import hashlib
from fastapi import HTTPException
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from app.core.config import settings

ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

"""
Hashes a plain text password using bcrypt.    
"""
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

"""
Verifies a plain text password against a bcrypt hash.
"""
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def generate_refresh_token() -> str:
    return secrets.token_urlsafe(32)

def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

"""
Create a signed JWT token with expiry.
"""
def create_access_token(data: dict) -> str:
    expiry = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub":data["sub"], "exp": expiry}, 
                   settings.SECRET_KEY, 
                   algorithm="HS256")
    
"""
Decodes and validates a JWT token. Raises 401 if invalid or expired.
"""
def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, 
                          algorithms=["HS256"])
    except JWTError: 
        raise HTTPException(status_code=401, detail="Invalid or expired token")