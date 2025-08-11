from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class MergeRequestBase(BaseModel):
    title: str
    description: Optional[str] = None
    source_branch: str
    target_branch: str


class MergeRequestCreate(MergeRequestBase):
    pass


class MergeRequest(BaseModel):
    id: str
    repository_id: str
    author_id: str
    title: str
    description: Optional[str]
    source_branch: str
    target_branch: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MergeRequestApproval(BaseModel):
    id: str
    merge_request_id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class MergeRequestCommentCreate(BaseModel):
    content: str


class MergeRequestComment(BaseModel):
    id: str
    merge_request_id: str
    user_id: str
    content: str
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


