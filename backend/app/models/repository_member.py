from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from enum import Enum as PyEnum

from ..db.base_class import Base

class RepositoryRole(str, PyEnum):
    VIEWER = "viewer"
    CONTRIBUTOR = "contributor" 
    ADMIN = "admin"

class RepositoryMember(Base):
    __tablename__ = "repository_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(RepositoryRole), default=RepositoryRole.VIEWER)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Связи
    repository = relationship("Repository", back_populates="members")
    user = relationship("User", back_populates="repository_memberships")
    
    def __repr__(self):
        return f"RepositoryMember(id={self.id!r}, repository_id={self.repository_id!r}, user_id={self.user_id!r})"
