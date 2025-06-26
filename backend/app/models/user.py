from sqlalchemy import Boolean, Column, String, DateTime, BigInteger
from sqlalchemy.orm import relationship
import datetime
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)  # Email can be null for Telegram users
    hashed_password = Column(String, nullable=True)  # Password can be null for Telegram users
    first_name = Column(String)
    last_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True, index=True)  # Telegram user ID
    auth_type = Column(String, default="password")  # "password" or "telegram"
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    projects = relationship("Project", back_populates="owner")
    dashboards = relationship("Dashboard", back_populates="owner")
    owned_repositories = relationship("Repository", foreign_keys="[Repository.owner_id]", back_populates="owner")
    repository_memberships = relationship("RepositoryMember", back_populates="user")
