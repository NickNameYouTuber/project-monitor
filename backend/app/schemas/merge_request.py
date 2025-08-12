from typing import List, Optional, Union
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from .git import GitFileChange


class MergeRequestBase(BaseModel):
    title: str
    description: Optional[str] = None
    source_branch: str
    target_branch: str
    reviewer_id: Optional[Union[str, UUID]] = None


class MergeRequestCreate(MergeRequestBase):
    pass


class MergeRequest(BaseModel):
    id: Union[str, UUID]
    repository_id: Union[str, UUID]
    author_id: Union[str, UUID]
    reviewer_id: Optional[Union[str, UUID]]
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
    id: Union[str, UUID]
    merge_request_id: Union[str, UUID]
    user_id: Union[str, UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class MergeRequestCommentCreate(BaseModel):
    content: str


class MergeRequestComment(BaseModel):
    id: Union[str, UUID]
    merge_request_id: Union[str, UUID]
    user_id: Union[str, UUID]
    content: str
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MergeRequestApprovalWithUser(BaseModel):
    id: Union[str, UUID]
    merge_request_id: Union[str, UUID]
    user_id: Union[str, UUID]
    user_name: Optional[str]
    created_at: datetime


class MergeRequestDetail(MergeRequest):
    approvals: List[MergeRequestApprovalWithUser] = []


class MergeRequestChanges(BaseModel):
    files: List[GitFileChange]


