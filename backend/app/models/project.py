from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
import datetime
from ..database import Base
import uuid


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(Text, nullable=True)
    status = Column(String)  # inPlans, inProgress, onPause, completed
    priority = Column(String)  # high, medium, low
    assignee = Column(String)
    order = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Foreign keys
    owner_id = Column(String, ForeignKey("users.id"))
    dashboard_id = Column(String, ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    dashboard = relationship("Dashboard", back_populates="projects")
    task_columns = relationship("TaskColumn", back_populates="project", cascade="all, delete-orphan")
