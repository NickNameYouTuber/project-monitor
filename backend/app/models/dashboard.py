from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime
from ..database import Base


class Dashboard(Base):
    __tablename__ = "dashboards"
    
    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Foreign keys
    owner_id = Column(String, ForeignKey("users.id"))
    
    # Relationships
    owner = relationship("User", back_populates="dashboards")
    projects = relationship("Project", back_populates="dashboard", cascade="all, delete")
