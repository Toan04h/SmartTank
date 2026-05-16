import uuid
from fastapi import HTTPException, Depends
from sqlmodel import Session
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User
from app.services.auth_service import decode_access_token
from app.core.database import get_session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> User:
    payload = decode_access_token(token)
    user_id = payload["sub"]
    
    user = session.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=401)
    
    return user