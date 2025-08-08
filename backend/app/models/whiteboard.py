from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base


class Whiteboard(Base):
    __tablename__ = "whiteboards"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    elements = relationship("WhiteboardElement", back_populates="whiteboard", cascade="all, delete-orphan")
    connections = relationship("WhiteboardConnection", back_populates="whiteboard", cascade="all, delete-orphan")


class WhiteboardElement(Base):
    __tablename__ = "whiteboard_elements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    whiteboard_id = Column(String, ForeignKey("whiteboards.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, default="sticky")  # sticky, shape, etc.
    text = Column(Text, nullable=True)
    x = Column(Integer, default=100)
    y = Column(Integer, default=100)
    width = Column(Integer, default=200)
    height = Column(Integer, default=120)
    color = Column(String, default="#FFF59D")  # soft yellow
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    whiteboard = relationship("Whiteboard", back_populates="elements")


class WhiteboardConnection(Base):
    __tablename__ = "whiteboard_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    whiteboard_id = Column(String, ForeignKey("whiteboards.id", ondelete="CASCADE"), nullable=False)
    from_element_id = Column(String, ForeignKey("whiteboard_elements.id", ondelete="CASCADE"), nullable=False)
    to_element_id = Column(String, ForeignKey("whiteboard_elements.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    whiteboard = relationship("Whiteboard", back_populates="connections")


