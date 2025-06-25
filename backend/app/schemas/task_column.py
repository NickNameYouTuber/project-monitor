from pydantic import BaseModel
from typing import Optional, List
from .task import TaskBase


class TaskColumnBase(BaseModel):
    name: str
    order: Optional[int] = 0


class TaskColumnCreate(TaskColumnBase):
    project_id: str


class TaskColumnUpdate(TaskColumnBase):
    name: Optional[str] = None
    order: Optional[int] = None


class TaskColumn(TaskColumnBase):
    id: str
    project_id: str

    class Config:
        orm_mode = True


class TaskColumnDetail(TaskColumn):
    tasks: List["TaskBase"] = []

    class Config:
        orm_mode = True
