from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.user import Token, UserCreate, UserResponse, TelegramAuth
from ..models.user import User
from ..auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash, verify_telegram_hash
import uuid
import hashlib
import hmac
import os

router = APIRouter()


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if username already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists (if provided)
    if user.email:
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Create new user
    user_data = {
        "id": str(uuid.uuid4()),
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "avatar_url": user.avatar_url,
        "auth_type": user.auth_type,
        "is_admin": False,  # Default is not admin
    }
    
    # Add email if provided
    if user.email:
        user_data["email"] = user.email
    
    # Add Telegram ID if provided
    if user.telegram_id:
        user_data["telegram_id"] = user.telegram_id
    
    # Add password if provided (for regular auth)
    if user.password:
        user_data["hashed_password"] = get_password_hash(user.password)
    
    db_user = User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/telegram", response_model=Token, status_code=status.HTTP_200_OK)
async def telegram_auth(auth_data: TelegramAuth, db: Session = Depends(get_db)):
    # Verify Telegram data with support for both WebApp and Login Widget
    is_valid = verify_telegram_hash(
        init_data=auth_data.init_data,
        auth_date=auth_data.auth_date,
        hash_to_verify=auth_data.hash
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authentication data"
        )
    
    # Check if user already exists by telegram_id
    db_user = db.query(User).filter(User.telegram_id == auth_data.telegram_id).first()
    
    if not db_user:
        # Create new user if not exists
        username = auth_data.username or f"tg_{auth_data.telegram_id}"
        
        # Check if username exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            # Generate unique username
            username = f"tg_{auth_data.telegram_id}"
        
        db_user = User(
            id=str(uuid.uuid4()),
            username=username,
            first_name=auth_data.first_name,
            last_name=auth_data.last_name,
            avatar_url=auth_data.photo_url,
            telegram_id=auth_data.telegram_id,
            auth_type="telegram"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": db_user}


@router.post("/guest", response_model=Token, status_code=status.HTTP_200_OK)
async def guest_login(db: Session = Depends(get_db)):
    """Create a temporary guest account for testing"""
    guest_id = f"guest_{uuid.uuid4().hex[:8]}"
    
    db_user = User(
        id=str(uuid.uuid4()),
        username=guest_id,
        first_name="Guest",
        last_name="User",
        auth_type="guest",
        is_admin=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": db_user}
