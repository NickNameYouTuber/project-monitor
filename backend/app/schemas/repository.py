from pydantic import BaseModel, UUID4, HttpUrl, validator, Field
from typing import Optional, List, Union
from datetime import datetime
import uuid
from .user import UserBasic
from ..models.repository import VisibilityType

# Базовая схема для репозитория
class RepositoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    visibility: VisibilityType = VisibilityType.PRIVATE
    project_id: Optional[UUID4] = None

# Схема для создания репозитория
class RepositoryCreate(RepositoryBase):
    pass

# Схема для обновления репозитория
class RepositoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    visibility: Optional[VisibilityType] = None
    project_id: Optional[UUID4] = None

# Полная схема репозитория (ответ API)
class Repository(RepositoryBase):
    id: str
    owner_id: str
    url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Расширенная схема с информацией о владельце
class RepositoryDetail(Repository):
    owner: UserBasic
    
    class Config:
        from_attributes = True
