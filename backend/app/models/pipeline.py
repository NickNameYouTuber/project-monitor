from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from enum import Enum as PyEnum

from ..db.base_class import Base
from ..db.custom_types import GUID


class PipelineSource(str, PyEnum):
    PUSH = "push"
    MR = "mr"


class PipelineStatus(str, PyEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELED = "canceled"


class JobStatus(str, PyEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELED = "canceled"


class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    repository_id = Column(GUID(), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    commit_sha = Column(String, nullable=True)
    ref = Column(String, nullable=True)
    source = Column(Enum(PipelineSource), default=PipelineSource.PUSH, nullable=False)
    status = Column(Enum(PipelineStatus), default=PipelineStatus.QUEUED, nullable=False)
    triggered_by_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    jobs = relationship("PipelineJob", back_populates="pipeline", cascade="all, delete-orphan")


class PipelineJob(Base):
    __tablename__ = "pipeline_jobs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(GUID(), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    stage = Column(String, nullable=True)
    image = Column(String, nullable=False)
    script = Column(Text, nullable=False)  # newline-separated commands
    env_json = Column(Text, nullable=True)
    needs_json = Column(Text, nullable=True)

    status = Column(Enum(JobStatus), default=JobStatus.QUEUED, nullable=False)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    exit_code = Column(Integer, nullable=True)
    retries = Column(Integer, default=0)
    max_retries = Column(Integer, default=0)
    timeout_seconds = Column(Integer, nullable=True)
    when = Column(String, nullable=True)  # on_success | manual | delayed
    is_manual = Column(Boolean, default=False)
    allow_failure = Column(Boolean, default=False)
    start_after_seconds = Column(Integer, nullable=True)
    rule_hint = Column(Text, nullable=True)
    manual_released = Column(Boolean, default=False)

    pipeline = relationship("Pipeline", back_populates="jobs")
    logs = relationship("PipelineLogChunk", back_populates="job", cascade="all, delete-orphan")
    artifacts = relationship("PipelineArtifact", back_populates="job", cascade="all, delete-orphan")


class PipelineLogChunk(Base):
    __tablename__ = "pipeline_log_chunks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    job_id = Column(GUID(), ForeignKey("pipeline_jobs.id", ondelete="CASCADE"), nullable=False)
    seq = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("PipelineJob", back_populates="logs")


class PipelineArtifact(Base):
    __tablename__ = "pipeline_artifacts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    job_id = Column(GUID(), ForeignKey("pipeline_jobs.id", ondelete="CASCADE"), nullable=False)
    path = Column(String, nullable=False)
    size = Column(Integer, nullable=True)
    content_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("PipelineJob", back_populates="artifacts")


class Runner(Base):
    __tablename__ = "runners"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    active = Column(Boolean, default=True)
    tags_json = Column(Text, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)


