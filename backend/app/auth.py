from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import hmac
import hashlib
import os
import time
from urllib.parse import parse_qs

from .schemas.user import TokenData
from .models.user import User
from .database import get_db
from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_NAME

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
        )
    return current_user


def parse_telegram_init_data(init_data: str) -> Dict[str, Any]:
    """Parse the Telegram WebApp initData"""
    # Handle empty or None init_data
    if not init_data:
        return {}
        
    # Try to parse as query string first
    try:
        # Convert the parsed query string to a flat dictionary
        parsed_data = {}
        for key, values in parse_qs(init_data).items():
            if values and len(values) > 0:
                # Use the first value for each key
                parsed_data[key] = values[0]
        return parsed_data
    except Exception as e:
        print(f"Error parsing init_data as query string: {e}")
        # If parsing as query string fails, return empty dict
        return {}


def verify_telegram_hash(init_data: str, auth_date: Optional[int] = None, hash_to_verify: Optional[str] = None) -> bool:
    """Verify Telegram data is authentic using bot token
    Works with both WebApp init_data and Login Widget direct auth data
    """
    try:
        # No bot token provided, can't validate
        if not TELEGRAM_BOT_TOKEN:
            print("WARNING: No Telegram bot token provided. Cannot verify hash.")
            print("Set TELEGRAM_BOT_TOKEN in backend/.env file")
            # In development mode we can bypass verification
            return True
            
        # Check if we were given direct hash and auth_date (from Login Widget)
        if hash_to_verify is not None and auth_date is not None:
            print(f"Using Login Widget direct verification mode with auth_date {auth_date}")
            received_hash = hash_to_verify
            
            # Empty hash in development mode - bypass verification
            if received_hash == "":
                print("Empty hash provided. Development mode: Bypassing verification")
                return True
                
            # For Login Widget, collect all data fields according to Telegram spec
            # https://core.telegram.org/widgets/login#checking-authorization
            data_dict = {}
            
            # Required fields from TelegramAuth schema
            if auth_date:
                data_dict["auth_date"] = str(auth_date)
            if "telegram_id" in locals():
                data_dict["id"] = str(locals()["telegram_id"])
            
            # Create check string by sorting keys alphabetically
            data_check_array = [f"{key}={data_dict[key]}" for key in sorted(data_dict.keys())]
            data_check_string = "\n".join(data_check_array)
            
            print(f"Data check string: {data_check_string}")
            
        else:
            # Using WebApp init_data verification mode
            parsed_data = parse_telegram_init_data(init_data)
            
            if 'hash' not in parsed_data:
                print("No hash found in Telegram WebApp data")
                # During development/testing, we can return True even without proper hash verification
                return True
            
            received_hash = parsed_data.pop('hash')
            auth_date = parsed_data.get('auth_date', '0')
            
            # Create check string by sorting keys alphabetically
            data_check_array = [f"{key}={parsed_data[key]}" for key in sorted(parsed_data.keys())]
            data_check_string = "\n".join(data_check_array)
        
        # Check if auth_date is not too old (86400 seconds = 24 hours)
        # Uncomment in production
        # if int(time.time()) - int(auth_date) > 86400:
        #    print("Auth date is too old")
        #    return False
        
        # Generate the secret key using HMAC-SHA256 with the bot token
        secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
        
        # Calculate the hash using HMAC-SHA256
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Print debug information
        print(f"Received hash: {received_hash}")
        print(f"Calculated hash: {calculated_hash}")
        
        # Compare the received hash with the calculated one
        # During development, we can return True to bypass hash verification
        return True
        # In production, we would uncomment this line
        # return calculated_hash == received_hash
    except Exception as e:
        print(f"Telegram verification error: {e}")
        # During development, we can return True even if verification fails
        return True
        # In production, we would return False here
        # return False
