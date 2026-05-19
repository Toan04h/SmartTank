import uuid
from fastapi import HTTPException, Depends
from sqlmodel import Session
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User
from app.services.auth_service import decode_access_token
from app.core.database import engine

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
) -> User:
    payload = decode_access_token(token)
    user_id = payload["sub"]
    
    with Session(engine) as session:
        user = session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_data = {
            "id": user.id,
            "email": user.email,
            "hashed_password": user.hashed_password,
            "full_name": user.full_name,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        }
       
    return User(**user_data)