from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class WhiteboardElementBase(BaseModel):
    type: str = "sticky"
    x: int
    y: int
    width: int
    height: int
    rotation: int = 0
    z_index: int = 0
    text: Optional[str] = None
    fill: Optional[str] = None


class WhiteboardElementCreate(WhiteboardElementBase):
    pass


class WhiteboardElementUpdate(BaseModel):
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    rotation: Optional[int] = None
    z_index: Optional[int] = None
    text: Optional[str] = None
    fill: Optional[str] = None


class WhiteboardElementResponse(WhiteboardElementBase):
    id: str
    board_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WhiteboardConnectionBase(BaseModel):
    source_element_id: str
    target_element_id: str
    stroke: Optional[str] = "#2b2d42"
    stroke_width: Optional[int] = 2
    points: Optional[str] = None


class WhiteboardConnectionCreate(WhiteboardConnectionBase):
    pass


class WhiteboardConnectionUpdate(BaseModel):
    stroke: Optional[str] = None
    stroke_width: Optional[int] = None
    points: Optional[str] = None


class WhiteboardConnectionResponse(WhiteboardConnectionBase):
    id: str
    board_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WhiteboardBase(BaseModel):
    project_id: str


class WhiteboardResponse(WhiteboardBase):
    id: str
    created_at: datetime
    updated_at: datetime
    elements: List[WhiteboardElementResponse] = []
    connections: List[WhiteboardConnectionResponse] = []

    class Config:
        from_attributes = True


