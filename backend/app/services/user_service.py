from sqlmodel import Session, select
from app.models.user import User
from typing import Optional

def get_user_by_email(email: str, session: Session) -> Optional[User]:
    user = session.exec(select(User).where(User.email==email)).first()
    return user

def create_user(email: str, hashed_password: str, session: Session) -> User:
    user = User(email=email, hashed_password=hashed_password)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user