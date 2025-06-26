from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from .user import UserBasic
from ..models.repository_member import RepositoryRole

# Базовая схема для члена репозитория
class RepositoryMemberBase(BaseModel):
    repository_id: UUID4
    user_id: UUID4
    role: RepositoryRole = RepositoryRole.VIEWER

# Схема для создания члена репозитория
class RepositoryMemberCreate(RepositoryMemberBase):
    pass

# Схема для обновления члена репозитория
class RepositoryMemberUpdate(BaseModel):
    role: Optional[RepositoryRole] = None
    is_active: Optional[bool] = None

# Полная схема члена репозитория (ответ API)
class RepositoryMember(RepositoryMemberBase):
    id: UUID4
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
