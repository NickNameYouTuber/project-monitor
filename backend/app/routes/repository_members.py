from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from .. import schemas
from ..models import Repository, RepositoryMember, RepositoryRole, User
from ..auth import get_current_active_user
from ..schemas.user import UserBasic

router = APIRouter()

@router.get("/{repository_id}/members", response_model=List[schemas.RepositoryMemberDetail])
async def read_repository_members(
    repository_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить список участников репозитория.
    """
    try:
        # Проверяем существование репозитория
        repository = db.query(Repository).filter(Repository.id == repository_id).first()
        if not repository:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository not found"
            )
        
        # Проверяем права доступа
        has_access = (str(repository.owner_id) == str(current_user.id)) or \
                    db.query(RepositoryMember).filter(
                        RepositoryMember.repository_id == repository_id,
                        RepositoryMember.user_id == current_user.id,
                        RepositoryMember.is_active == True
                    ).first() is not None
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this repository"
            )
        
        # Fetch members with eager loading of user relationship
        members = db.query(RepositoryMember).options(
            joinedload(RepositoryMember.user)
        ).filter(
            RepositoryMember.repository_id == repository_id,
            RepositoryMember.is_active == True
        ).offset(skip).limit(limit).all()
        
        # Manually convert each member to a Pydantic model
        result = []
        for member in members:
            # Convert user data to dict with string IDs
            user_dict = {
                'id': str(member.user.id),
                'username': member.user.username,
                'first_name': member.user.first_name,
                'last_name': member.user.last_name,
                'avatar_url': member.user.avatar_url
            }
            
            # Create member dict with string IDs
            member_dict = {
                'id': str(member.id),
                'repository_id': str(member.repository_id),
                'user_id': str(member.user_id),
                'role': member.role,
                'is_active': member.is_active,
                'created_at': member.created_at,
                'updated_at': member.updated_at,
                'user': UserBasic.model_validate(user_dict)
            }
            
            result.append(schemas.RepositoryMemberDetail.model_validate(member_dict))
        
        return result
    
    except Exception as e:
        print(f"Error in read_repository_members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/{repository_id}/members", response_model=schemas.RepositoryMember, status_code=status.HTTP_201_CREATED)
async def add_repository_member(
    repository_id: str,
    member: schemas.RepositoryMemberCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Добавить пользователя в репозиторий.
    """
    # Проверяем существование репозитория
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    # Проверяем права доступа - только владелец или админ может добавлять участников
    is_owner = repository.owner_id == current_user.id
    is_admin = db.query(RepositoryMember).filter(
        RepositoryMember.repository_id == repository_id,
        RepositoryMember.user_id == current_user.id,
        RepositoryMember.role == RepositoryRole.ADMIN,
        RepositoryMember.is_active == True
    ).first() is not None
    
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add members to this repository"
        )
    
    # Проверяем существование пользователя
    user = db.query(User).filter(User.id == member.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Проверяем, не является ли пользователь уже участником
    existing_member = db.query(RepositoryMember).filter(
        RepositoryMember.repository_id == repository_id,
        RepositoryMember.user_id == member.user_id
    ).first()
    
    if existing_member:
        if existing_member.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this repository"
            )
        else:
            # Если пользователь был отключен, активируем его снова
            existing_member.is_active = True
            existing_member.role = member.role
            db.commit()
            db.refresh(existing_member)
            return existing_member
    
    # Создаем нового участника
    db_member = RepositoryMember(
        repository_id=repository_id,
        user_id=member.user_id,
        role=member.role
    )
    
    try:
        db.add(db_member)
        db.commit()
        db.refresh(db_member)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not add member with the provided data"
        )
    
    return db_member


@router.put("/{repository_id}/members/{member_id}", response_model=schemas.RepositoryMember)
async def update_repository_member(
    repository_id: str,
    member_id: str,
    member_update: schemas.RepositoryMemberUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Обновить информацию об участнике репозитория.
    """
    # Проверяем существование репозитория
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    # Проверяем права доступа
    is_owner = repository.owner_id == current_user.id
    is_admin = db.query(RepositoryMember).filter(
        RepositoryMember.repository_id == repository_id,
        RepositoryMember.user_id == current_user.id,
        RepositoryMember.role == RepositoryRole.ADMIN,
        RepositoryMember.is_active == True
    ).first() is not None
    
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update members in this repository"
        )
    
    # Проверяем существование участника
    member = db.query(RepositoryMember).filter(
        RepositoryMember.id == member_id,
        RepositoryMember.repository_id == repository_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Нельзя менять роль владельца
    if member.user_id == repository.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change the role of the repository owner"
        )
    
    # Обновляем поля
    update_data = member_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(member, key, value)
    
    db.commit()
    db.refresh(member)
    
    return member


@router.delete("/{repository_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_repository_member(
    repository_id: str,
    member_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Удалить участника из репозитория.
    """
    # Проверяем существование репозитория
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    # Проверяем права доступа
    is_owner = repository.owner_id == current_user.id
    is_admin = db.query(RepositoryMember).filter(
        RepositoryMember.repository_id == repository_id,
        RepositoryMember.user_id == current_user.id,
        RepositoryMember.role == RepositoryRole.ADMIN,
        RepositoryMember.is_active == True
    ).first() is not None
    
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove members from this repository"
        )
    
    # Проверяем существование участника
    member = db.query(RepositoryMember).filter(
        RepositoryMember.id == member_id,
        RepositoryMember.repository_id == repository_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Нельзя удалить владельца из репозитория
    if member.user_id == repository.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the repository owner"
        )
    
    # Удаляем участника (деактивируем, а не удаляем полностью)
    member.is_active = False
    db.commit()
    
    return None
