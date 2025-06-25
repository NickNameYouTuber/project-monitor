from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.user import UserResponse, UserUpdate
from ..models.user import User
from ..auth import get_current_active_user, get_admin_user, get_password_hash

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_user_me(user_update: UserUpdate, 
                        current_user: User = Depends(get_current_active_user),
                        db: Session = Depends(get_db)):
    # Update user data
    if user_update.username is not None:
        # Check if username already exists
        db_user = db.query(User).filter(User.username == user_update.username).first()
        if db_user and db_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        current_user.username = user_update.username
    
    if user_update.email is not None:
        # Check if email already exists
        db_user = db.query(User).filter(User.email == user_update.email).first()
        if db_user and db_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_update.email
    
    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    
    if user_update.password is not None:
        current_user.hashed_password = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/", response_model=List[UserResponse])
async def read_users(skip: int = 0, limit: int = 100, 
                    current_user: User = Depends(get_admin_user),
                    db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/search", response_model=List[UserResponse])
async def search_users(username: str = None, 
                      db: Session = Depends(get_db)):
    # Поиск пользователей по имени пользователя, доступен всем
    query = db.query(User)
    if username:
        query = query.filter(User.username.ilike(f'%{username}%'))
    
    # Возвращаем только пользователей с заполненным telegram_id
    query = query.filter(User.telegram_id != None)
    users = query.limit(10).all()  # Ограничиваем результаты для производительности
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def read_user(user_id: str,
                   current_user: User = Depends(get_admin_user),
                   db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
