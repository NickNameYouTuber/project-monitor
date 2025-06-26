from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class PATBase(BaseModel):
    """Base personal access token schema with common attributes"""
    name: str
    description: Optional[str] = None


class PATCreate(PATBase):
    """Schema for creating a new personal access token"""
    expires_days: Optional[int] = None


class PATResponse(PATBase):
    """Response with generated personal access token value"""
    token: str
    expires_at: Optional[datetime] = None


class PAT(PATBase):
    """Personal access token schema for display"""
    id: UUID
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool

    class Config:
        orm_mode = True


class PATList(BaseModel):
    """List of personal access tokens"""
    tokens: List[PAT]
