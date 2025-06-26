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
    id: Union[UUID4, str]
    owner_id: Union[UUID4, str]
    url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True
        
    @validator('id', 'owner_id', pre=True)
    def validate_uuid(cls, value):
        if isinstance(value, str):
            try:
                return uuid.UUID(value)
            except ValueError:
                pass
        return value

# Расширенная схема с информацией о владельце
class RepositoryDetail(Repository):
    owner: UserBasic
    
    class Config:
        orm_mode = True
