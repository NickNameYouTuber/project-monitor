from sqlalchemy import Column, String, Text, Integer, ForeignKey, Table, Boolean, DateTime
from sqlalchemy.orm import relationship
from ..database import Base
import uuid
from datetime import datetime


# Промежуточная таблица для связи многие-ко-многим между задачами и исполнителями
task_assignees = Table(
    "task_assignees",
    Base.metadata,
    Column("task_id", String, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    column_id = Column(String, ForeignKey("task_columns.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, default=0)
    estimate_hours = Column(Integer, nullable=True)
    due_date = Column(DateTime, nullable=True)
    reviewer_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    column = relationship("TaskColumn", back_populates="tasks")
    project = relationship("Project")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    
    # Многие-ко-многим с пользователями (исполнители)
    assignees = relationship("User", secondary=task_assignees, backref="assigned_tasks")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
