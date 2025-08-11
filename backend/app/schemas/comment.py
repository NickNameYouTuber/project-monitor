from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CommentBase(BaseModel):
    content: str
    is_system: bool = False


class CommentCreate(CommentBase):
    task_id: str


class CommentUpdate(CommentBase):
    pass


class Comment(CommentBase):
    id: str
    task_id: str
    user_id: str
    username: str  # Дополнительное поле для удобства фронтенда
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
