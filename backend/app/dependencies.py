from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from .database import get_db as database_get_db
from .models.user import User
from .schemas.user import TokenData
from .config import SECRET_KEY, ALGORITHM

# Re-export get_db from database
get_db = database_get_db

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")
"""
OAuth2 password bearer scheme configuration.
Uses /api/auth/token endpoint for token acquisition.
"""

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Verify and retrieve current authenticated user from JWT token.
    
    Decodes the JWT token, validates claims, and retrieves corresponding user from database.
    
    Args:
        token (str): JWT access token from request headers
        db (Session): Database session dependency
        
    Returns:
        User: The authenticated user object
        
    Raises:
        HTTPException: 401 Unauthorized if token is invalid or user not found
    """
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

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """
    Ensure current user is active.
    
    Verifies that the authenticated user has active status.
    
    Args:
        current_user (User): User object from get_current_user dependency
        
    Returns:
        User: The active user object
        
    Raises:
        HTTPException: 400 Bad Request if user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
