from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class ProjectStatus(str, Enum):
    IN_PLANS = "inPlans"
    IN_PROGRESS = "inProgress"
    ON_PAUSE = "onPause"
    COMPLETED = "completed"


class ProjectPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus
    priority: ProjectPriority
    assignee: str
    order: int


class ProjectCreate(ProjectBase):
    dashboard_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    assignee: Optional[str] = None
    order: Optional[int] = None
    dashboard_id: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    owner_id: str
    dashboard_id: Optional[str] = None

    class Config:
        orm_mode = True
