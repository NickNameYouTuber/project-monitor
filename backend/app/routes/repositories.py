from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from .. import schemas
from ..models import Repository, RepositoryMember, RepositoryRole, User
from ..auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Repository])
async def read_repositories(
    skip: int = 0, 
    limit: int = 100,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получить список репозиториев пользователя.
    Может фильтровать по project_id, если указан.
    """
    from sqlalchemy import or_
    import json
    
    try:
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
        
        # Debug: print repository data
        for repo in repositories:
            print(f"Repository debug: id={repo.id} (type={type(repo.id).__name__}), owner_id={repo.owner_id} (type={type(repo.owner_id).__name__}), project_id={repo.project_id if repo.project_id else 'None'} (type={type(repo.project_id).__name__ if repo.project_id else 'NoneType'})")
            print(f"  name={repo.name if repo.name else 'None'} (type={type(repo.name).__name__}), url={repo.url if repo.url else 'None'} (type={type(repo.url).__name__})")
            print(f"  created_at={repo.created_at if repo.created_at else 'None'} (type={type(repo.created_at).__name__}), updated_at={repo.updated_at if repo.updated_at else 'None'} (type={type(repo.updated_at).__name__})")
        
        # Convert SQLAlchemy models to Pydantic models manually using Pydantic v2 syntax
        result = []
        for repo in repositories:
            repo_dict = {
                'id': str(repo.id),
                'owner_id': str(repo.owner_id),
                'name': repo.name,
                'description': repo.description,
                'visibility': repo.visibility,
                'project_id': str(repo.project_id) if repo.project_id else None,
                'url': repo.url,
                'created_at': repo.created_at,
                'updated_at': repo.updated_at
            }
            result.append(schemas.Repository.model_validate(repo_dict))
        return result
    except Exception as e:
        print(f"Error in read_repositories: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
    repository_id: str,
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
    
    # Convert to Pydantic model using Pydantic v2 syntax
    repo_dict = {
        'id': str(repository.id),
        'owner_id': str(repository.owner_id),
        'name': repository.name,
        'description': repository.description,
        'visibility': repository.visibility,
        'project_id': str(repository.project_id) if repository.project_id else None,
        'url': repository.url,
        'created_at': repository.created_at,
        'updated_at': repository.updated_at,
        'owner': schemas.UserBasic.model_validate({
            'id': str(repository.owner.id),
            'username': repository.owner.username,
            'first_name': repository.owner.first_name,
            'last_name': repository.owner.last_name,
            'avatar_url': repository.owner.avatar_url
        })
    }
    return schemas.RepositoryDetail.model_validate(repo_dict)


@router.put("/{repository_id}", response_model=schemas.Repository)
async def update_repository(
    repository_id: str,
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
    repository_id: str,
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
