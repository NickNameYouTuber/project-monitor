from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .project import ProjectResponse


class DashboardBase(BaseModel):
    name: str
    description: Optional[str] = None


class DashboardCreate(DashboardBase):
    pass


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DashboardResponse(DashboardBase):
    id: str
    created_at: datetime
    owner_id: str
    
    class Config:
        orm_mode = True


class DashboardDetailResponse(DashboardResponse):
    projects: List[ProjectResponse] = []
    
    class Config:
        orm_mode = True
