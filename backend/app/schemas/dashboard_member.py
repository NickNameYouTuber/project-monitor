from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .user import UserResponse


class DashboardMemberBase(BaseModel):
    dashboard_id: str
    user_id: str
    role: str = "viewer"  # viewer, editor, admin
    
    
class DashboardMemberCreate(DashboardMemberBase):
    pass


class DashboardMemberUpdate(BaseModel):
    role: Optional[str] = None


class DashboardMemberResponse(DashboardMemberBase):
    id: str
    created_at: datetime
    is_active: bool
    
    class Config:
        orm_mode = True


class DashboardMemberDetailResponse(DashboardMemberResponse):
    user: UserResponse
    
    class Config:
        orm_mode = True


class DashboardInviteByTelegram(BaseModel):
    telegram_id: int
    role: str = "viewer"
