import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Column, String
from typing import Optional
from pydantic import EmailStr

class User(SQLModel, table=True):
    __tablename__ = "users" # type: ignore
    
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
    )
    email: EmailStr = Field(
        sa_column=Column(
            String(255),
            unique=True,
            index=True,
            nullable=False
        )
    )
    hashed_password: str
    full_name: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    