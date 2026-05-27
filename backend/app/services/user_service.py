import uuid
from fastapi import HTTPException
from sqlmodel import Session, select
from app.models.user import User
from app.schemas.auth import UserProfileUpdate
from typing import Optional
from datetime import datetime

def get_user_by_email(email: str, session: Session) -> Optional[User]:
    user = session.exec(
        select(User).where(
            User.email==email
        )
    ).first()
    return user

def create_user(
    email: str, 
    hashed_password: str, 
    session: Session,
    state: Optional[str] = None,
    zip_code: Optional[str] = None
) -> User:
    user = User(
        email=email, 
        hashed_password=hashed_password,
        state=state,
        zip_code=zip_code
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def update_user_profile(
    user_id: uuid.UUID,
    profile_data: UserProfileUpdate,
    session: Session
) -> User:
    user = session.exec(
        select(User).where(
            User.id==user_id
        )
    ).first()
    
    if not user: 
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    if profile_data.full_name is not None:
        user.full_name = profile_data.full_name
    if profile_data.state is not None:
        user.state = profile_data.state
    if profile_data.zip_code is not None:
        user.zip_code = profile_data.zip_code
    user.updated_at = datetime.utcnow()
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user