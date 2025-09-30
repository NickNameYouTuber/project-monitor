from sqlalchemy import Column, String, Text, DateTime, Integer, Table, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base
import uuid
from datetime import datetime


call_participants = Table(
    "call_participants",
    Base.metadata,
    Column("call_id", String, ForeignKey("calls.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
)


class Call(Base):
    __tablename__ = "calls"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_start = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    created_by_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    participants = relationship("User", secondary=call_participants, backref="calls")


