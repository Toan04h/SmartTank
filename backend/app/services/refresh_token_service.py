import uuid
from sqlmodel import Session, select
from fastapi import HTTPException
from app.models.refresh_token import RefreshToken
from app.services.auth_service import generate_refresh_token, hash_refresh_token
from datetime import datetime, timedelta

REFRESH_TOKEN_EXPIRE_DAYS = 30

async def create_refresh_token(
    user_id: uuid.UUID,
    session: Session
) -> str: 
    token = generate_refresh_token()
    hashed_token = hash_refresh_token(token)
    
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = RefreshToken(
        token=hashed_token,
        user_id=user_id,
        expires_at=expires_at,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    
    session.add(refresh_token)
    session.commit()
    session.refresh(refresh_token)
    
    return token

def verify_refresh_token(
    raw_token: str,
    session: Session
) -> uuid.UUID:
    hashed_token = hash_refresh_token(raw_token)
    
    refresh_token = session.exec(
        select(RefreshToken).where(
            RefreshToken.token==hashed_token,
            RefreshToken.is_active==True,
            RefreshToken.expires_at > datetime.utcnow()
        )
    ).first()
    
    if not refresh_token: 
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token"
        )
        
    return refresh_token.user_id

async def revoke_refresh_token(
    raw_token: str,
    session: Session
) -> RefreshToken:
    hashed_token = hash_refresh_token(raw_token)
    
    refresh_token = session.exec(
        select(RefreshToken).where(
            RefreshToken.token==hashed_token,
            RefreshToken.is_active==True,
            RefreshToken.expires_at > datetime.utcnow()
        )
    ).first()
    
    if not refresh_token: 
        raise HTTPException(
            status_code=404,
            detail="Token not found"
        )
        
    refresh_token.is_active = False
    
    session.add(refresh_token)
    session.commit()
    session.refresh(refresh_token)
    
    return refresh_token