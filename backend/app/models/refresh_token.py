import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field

class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"  # type: ignore

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )
    token: str = Field(unique=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    expires_at: datetime
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)