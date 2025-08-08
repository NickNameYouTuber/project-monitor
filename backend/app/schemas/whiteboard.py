from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class WhiteboardElementBase(BaseModel):
    type: str = "sticky"
    text: Optional[str] = None
    x: int
    y: int
    width: int
    height: int
    color: str


class WhiteboardElementCreate(WhiteboardElementBase):
    pass


class WhiteboardElementUpdate(BaseModel):
    text: Optional[str] = None
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    color: Optional[str] = None


class WhiteboardElementResponse(WhiteboardElementBase):
    id: str
    whiteboard_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WhiteboardConnectionBase(BaseModel):
    from_element_id: str
    to_element_id: str


class WhiteboardConnectionCreate(WhiteboardConnectionBase):
    pass


class WhiteboardConnectionResponse(WhiteboardConnectionBase):
    id: str
    whiteboard_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class WhiteboardResponse(BaseModel):
    id: str
    project_id: str
    elements: List[WhiteboardElementResponse]
    connections: List[WhiteboardConnectionResponse]
    created_at: datetime

    class Config:
        from_attributes = True


