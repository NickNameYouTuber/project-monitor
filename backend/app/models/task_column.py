from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base
import uuid


class TaskColumn(Base):
    __tablename__ = "task_columns"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    order = Column(Integer, default=0)

    # Relationships
    project = relationship("Project", back_populates="task_columns")
    tasks = relationship("Task", back_populates="column", cascade="all, delete-orphan")
