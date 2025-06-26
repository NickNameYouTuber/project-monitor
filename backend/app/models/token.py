import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator
import json

from ..database import Base


# Custom type for UUID compatibility with SQLite
class UUIDString(TypeDecorator):
    """Platform-independent UUID type.
    Uses PostgreSQL's UUID type, otherwise uses
    CHAR(36), storing as stringified UUID.
    """
    impl = String(36)  # SQLite compatible

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            return uuid.UUID(value)


class PersonalAccessToken(Base):
    """Personal access token for Git operations"""
    __tablename__ = "personal_access_tokens"
    
    id = Column(UUIDString, primary_key=True, default=lambda: str(uuid.uuid4()))
    token = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Relations
    user_id = Column(UUIDString, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=True)
    
    # Active status
    is_active = Column(Boolean, default=True)
