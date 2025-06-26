from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from ..database import get_db
from .. import schemas
from ..models import Repository, RepositoryMember, RepositoryRole, User
from ..auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Repository])
async def read_repositories(
    skip: int = 0, 
    limit: int = 100,
    project_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить список репозиториев пользователя.
    Может фильтровать по project_id, если указан.
    """
    from sqlalchemy import or_
    
    # Получаем ID репозиториев, где пользователь является членом
    member_repos = db.query(RepositoryMember.repository_id).filter(
        RepositoryMember.user_id == current_user.id,
        RepositoryMember.is_active == True
    ).all()
    
    repo_ids = [r[0] for r in member_repos]
    
    # Базовый фильтр доступа
    query = db.query(Repository).filter(
        or_(
            Repository.owner_id == current_user.id,
            Repository.id.in_(repo_ids)
        )
    )
    
    # Фильтрация по project_id (если указан)
    if project_id:
        query = query.filter(Repository.project_id == project_id)
    
    repositories = query.offset(skip).limit(limit).all()
    return repositories


@router.post("/", response_model=schemas.Repository, status_code=status.HTTP_201_CREATED)
async def create_repository(
    repository: schemas.RepositoryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Создать новый репозиторий.
    """
    db_repository = Repository(
        **repository.dict(),
        owner_id=current_user.id
    )
    
    try:
        db.add(db_repository)
        db.commit()
        db.refresh(db_repository)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create repository with the provided data."
        )
    
    # Добавляем владельца как администратора репозитория
    db_repo_member = RepositoryMember(
        repository_id=db_repository.id,
        user_id=current_user.id,
        role=RepositoryRole.ADMIN
    )
    
    db.add(db_repo_member)
    db.commit()
    
    return db_repository


@router.get("/{repository_id}", response_model=schemas.RepositoryDetail)
async def read_repository(
    repository_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить детальную информацию о репозитории по ID.
    """
    repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    # Проверяем права доступа
    has_access = (repository.owner_id == current_user.id) or \
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
    
    return repository


@router.put("/{repository_id}", response_model=schemas.Repository)
async def update_repository(
    repository_id: UUID,
    repository_update: schemas.RepositoryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Обновить информацию о репозитории.
    """
    db_repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not db_repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    # Проверяем права доступа - только владелец или админ может обновлять репозиторий
    is_owner = db_repository.owner_id == current_user.id
    is_admin = db.query(RepositoryMember).filter(
        RepositoryMember.repository_id == repository_id,
        RepositoryMember.user_id == current_user.id,
        RepositoryMember.role == RepositoryRole.ADMIN,
        RepositoryMember.is_active == True
    ).first() is not None
    
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this repository"
        )
    
    # Обновляем только указанные поля
    update_data = repository_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_repository, key, value)
    
    try:
        db.commit()
        db.refresh(db_repository)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not update repository with the provided data."
        )
    
    return db_repository


@router.delete("/{repository_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repository(
    repository_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Удалить репозиторий. Только владелец может удалять репозиторий.
    """
    db_repository = db.query(Repository).filter(Repository.id == repository_id).first()
    if not db_repository:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )
    
    # Только владелец может удалить репозиторий
    if db_repository.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this repository"
        )
    
    db.delete(db_repository)
    db.commit()
    
    return None
