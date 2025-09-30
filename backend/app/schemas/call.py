from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class CallBase(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    participant_ids: Optional[List[str]] = None


class CallCreate(CallBase):
    pass


class CallUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    participant_ids: Optional[List[str]] = None


class Call(CallBase):
    id: str
    created_by_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


