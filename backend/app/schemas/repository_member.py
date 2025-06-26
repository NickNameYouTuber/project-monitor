from pydantic import BaseModel, UUID4, validator
from typing import Optional, Union
from datetime import datetime
import uuid
from .user import UserBasic
from ..models.repository_member import RepositoryRole

# Базовая схема для члена репозитория
class RepositoryMemberBase(BaseModel):
    repository_id: Union[UUID4, str]
    user_id: Union[UUID4, str]
    role: RepositoryRole = RepositoryRole.VIEWER
    
    @validator('repository_id', 'user_id', pre=True)
    def validate_uuid(cls, value):
        if isinstance(value, str):
            try:
                return uuid.UUID(value)
            except ValueError:
                pass
        return value

# Схема для создания члена репозитория
class RepositoryMemberCreate(RepositoryMemberBase):
    pass

# Схема для обновления члена репозитория
class RepositoryMemberUpdate(BaseModel):
    role: Optional[RepositoryRole] = None
    is_active: Optional[bool] = None

# Полная схема члена репозитория (ответ API)
class RepositoryMember(RepositoryMemberBase):
    id: Union[UUID4, str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Расширенная схема с информацией о пользователе
class RepositoryMemberDetail(RepositoryMember):
    user: UserBasic
    
    class Config:
        orm_mode = True
