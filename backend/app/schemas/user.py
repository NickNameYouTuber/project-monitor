from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    first_name: str
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    auth_type: str = "password"
    telegram_id: Optional[int] = None


class UserBasic(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserCreate(UserBase):
    password: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "username": "johndoe",
                    "email": "john@example.com",
                    "first_name": "John",
                    "last_name": "Doe",
                    "password": "secret123",
                    "auth_type": "password"
                },
                {
                    "username": "telegramuser",
                    "first_name": "Telegram",
                    "last_name": "User",
                    "avatar_url": "https://t.me/i/userpic/123",
                    "auth_type": "telegram",
                    "telegram_id": 123456789
                }
            ]
        }


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None
    telegram_id: Optional[int] = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None


class TelegramAuth(BaseModel):
    telegram_id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: Optional[int] = None
    hash: Optional[str] = None
    init_data: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "examples": [
                {
                    # Telegram Login Widget format
                    "telegram_id": 123456789,
                    "first_name": "John",
                    "last_name": "Doe",
                    "username": "johndoe",
                    "photo_url": "https://t.me/i/userpic/123",
                    "auth_date": 1624646400,
                    "hash": "abcdef1234567890"
                }
            ]
        }
