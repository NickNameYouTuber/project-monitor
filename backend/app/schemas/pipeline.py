from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from ..models.pipeline import PipelineStatus, JobStatus, PipelineSource
from uuid import UUID
from datetime import datetime


class PipelineJob(BaseModel):
    id: UUID
    name: str
    stage: Optional[str] = None
    image: str
    script: str
    status: JobStatus
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    exit_code: Optional[int] = None

    class Config:
        from_attributes = True


class Pipeline(BaseModel):
    id: UUID
    repository_id: UUID
    commit_sha: Optional[str] = None
    ref: Optional[str] = None
    source: PipelineSource
    status: PipelineStatus
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    jobs: List[PipelineJob] = []

    class Config:
        from_attributes = True


class PipelineListItem(BaseModel):
    id: UUID
    status: PipelineStatus
    commit_sha: Optional[str] = None
    ref: Optional[str] = None
    source: PipelineSource
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TriggerPipelineRequest(BaseModel):
    ref: Optional[str] = None
    commit_sha: Optional[str] = None
    source: PipelineSource = PipelineSource.PUSH


class LeaseRequest(BaseModel):
    tags: Optional[List[str]] = None


class LeaseResponse(BaseModel):
    job_id: str
    repository_id: str
    repo_path: str
    commit_sha: Optional[str] = None
    image: str
    script: List[str]
    env: Dict[str, str] = {}
    artifacts_paths: List[str] = []


class JobStatusUpdate(BaseModel):
    status: JobStatus
    exit_code: Optional[int] = None


class JobLogChunk(BaseModel):
    seq: int
    content: str


