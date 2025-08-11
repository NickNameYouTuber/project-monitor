from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from enum import Enum as PyEnum

from ..db.base_class import Base
from ..db.custom_types import GUID


class MergeRequestStatus(str, PyEnum):
    OPEN = "open"
    MERGED = "merged"
    CLOSED = "closed"


class MergeRequest(Base):
    __tablename__ = "merge_requests"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    repository_id = Column(GUID(), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source_branch = Column(String, nullable=False)
    target_branch = Column(String, nullable=False)
    status = Column(Enum(MergeRequestStatus), default=MergeRequestStatus.OPEN, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    approvals = relationship("MergeRequestApproval", back_populates="merge_request", cascade="all, delete-orphan")
    comments = relationship("MergeRequestComment", back_populates="merge_request", cascade="all, delete-orphan")


class MergeRequestApproval(Base):
    __tablename__ = "merge_request_approvals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    merge_request_id = Column(GUID(), ForeignKey("merge_requests.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    merge_request = relationship("MergeRequest", back_populates="approvals")


class MergeRequestComment(Base):
    __tablename__ = "merge_request_comments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    merge_request_id = Column(GUID(), ForeignKey("merge_requests.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    merge_request = relationship("MergeRequest", back_populates="comments")


