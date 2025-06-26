from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from enum import Enum as PyEnum

from ..db.base_class import Base
from ..db.custom_types import GUID

class VisibilityType(str, PyEnum):
    PUBLIC = "public"
    PRIVATE = "private"

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String, nullable=True)  # URL для клонирования
    local_path = Column(String, nullable=True)  # Путь в локальном хранилище
    visibility = Column(Enum(VisibilityType), default=VisibilityType.PRIVATE)
    
    owner_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    project_id = Column(GUID(), ForeignKey("projects.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Связи
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_repositories")
    project = relationship("Project", back_populates="repositories")
    members = relationship("RepositoryMember", back_populates="repository", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"Repository(id={self.id!r}, name={self.name!r}, owner_id={self.owner_id!r})"
