from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    order: Optional[int] = 0
    reviewer_id: Optional[str] = None


class TaskCreate(TaskBase):
    column_id: str
    project_id: str
    assignee_ids: Optional[List[str]] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    column_id: Optional[str] = None
    order: Optional[int] = None
    assignee_ids: Optional[List[str]] = None
    reviewer_id: Optional[str] = None


class TaskMoveUpdate(BaseModel):
    column_id: str
    order: int


class AssigneeBase(BaseModel):
    id: str
    username: str
    
    class Config:
        from_attributes = True


class Task(TaskBase):
    id: str
    column_id: str
    project_id: str
    created_at: datetime
    updated_at: datetime
    assignees: List[AssigneeBase] = []

    class Config:
        from_attributes = True


class TaskDetail(Task):
    """Детальная модель задачи с дополнительной информацией"""
    pass
