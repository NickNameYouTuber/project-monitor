from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from ..database import Base
import uuid
from datetime import datetime


class Whiteboard(Base):
    __tablename__ = "whiteboards"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project")
    elements = relationship("WhiteboardElement", back_populates="board", cascade="all, delete-orphan")
    connections = relationship("WhiteboardConnection", back_populates="board", cascade="all, delete-orphan")


class WhiteboardElement(Base):
    __tablename__ = "whiteboard_elements"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    board_id = Column("whiteboard_id", String, ForeignKey("whiteboards.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String, nullable=False, default="sticky")
    x = Column(Integer, default=0)
    y = Column(Integer, default=0)
    width = Column(Integer, default=160)
    height = Column(Integer, default=120)
    rotation = Column(Integer, default=0)
    z_index = Column(Integer, default=0)
    text = Column(Text, nullable=True)
    fill = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    board = relationship("Whiteboard", back_populates="elements")


class WhiteboardConnection(Base):
    __tablename__ = "whiteboard_connections"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    board_id = Column("whiteboard_id", String, ForeignKey("whiteboards.id", ondelete="CASCADE"), nullable=False, index=True)
    source_element_id = Column(String, ForeignKey("whiteboard_elements.id", ondelete="CASCADE"), nullable=False)
    target_element_id = Column(String, ForeignKey("whiteboard_elements.id", ondelete="CASCADE"), nullable=False)
    stroke = Column(String, default="#2b2d42")
    stroke_width = Column(Integer, default=2)
    points = Column(Text, nullable=True)  # JSON-serialized polyline points if needed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    board = relationship("Whiteboard", back_populates="connections")


