import uuid
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(
    prefix="/tokens",
    tags=["tokens"]
)


@router.post("/", response_model=schemas.PATResponse)
def create_token(
    token_create: schemas.PATCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new personal access token for Git operations"""
    # Generate a secure random token
    token_value = secrets.token_urlsafe(32)
    
    # Calculate expiration date if specified
    expires_at = None
    if token_create.expires_days is not None:
        expires_at = datetime.utcnow() + timedelta(days=token_create.expires_days)
    
    # Create token record
    db_token = models.PersonalAccessToken(
        id=str(uuid.uuid4()),
        token=token_value,
        name=token_create.name,
        description=token_create.description,
        user_id=str(current_user.id),
        expires_at=expires_at,
        is_active=True
    )
    
    # Save to database
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    
    # Return the token value but only once - it won't be retrievable later
    return {
        "name": db_token.name,
        "description": db_token.description,
        "token": token_value,
        "expires_at": db_token.expires_at
    }


@router.get("/", response_model=schemas.PATList)
def list_tokens(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all personal access tokens for the current user"""
    tokens = db.query(models.PersonalAccessToken).filter(
        models.PersonalAccessToken.user_id == current_user.id
    ).all()
    
    return {"tokens": tokens}


@router.get("/{token_id}", response_model=schemas.PAT)
def get_token(
    token_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get details for a specific token"""
    token = db.query(models.PersonalAccessToken).filter(
        models.PersonalAccessToken.id == token_id,
        models.PersonalAccessToken.user_id == current_user.id
    ).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    return token


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_token(
    token_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Revoke/delete a personal access token"""
    token = db.query(models.PersonalAccessToken).filter(
        models.PersonalAccessToken.id == token_id,
        models.PersonalAccessToken.user_id == current_user.id
    ).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    db.delete(token)
    db.commit()
    
    return None
