from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import git
import uuid
from datetime import datetime
from pathlib import Path
import os

from ..database import get_db
from ..models import Repository, Task, Comment, User
from ..schemas import git as git_schemas
from ..routes.auth import get_current_active_user
from ..routes.repository_content import get_repo_path, check_repository_access

router = APIRouter(
    prefix="/task-repository",
    tags=["task-repository"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{task_id}/branches")
async def get_task_related_branches(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get branches related to a specific task
    """
    try:
        # Проверяем доступ к задаче
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        
        # Получаем комментарии задачи, которые содержат информацию о ветках
        branch_comments = db.query(Comment).filter(
            Comment.task_id == task_id,
            Comment.is_system == True,
            Comment.content.like("%Created branch%")
        ).all()
        
        result = []
        
        # Извлекаем информацию о ветках из комментариев
        for comment in branch_comments:
            # Ищем название ветки в формате "Created branch **branch_name** from base_branch"
            content = comment.content
            try:
                # Парсим название ветки из комментария
                branch_name = content.split("**")[1]
                base_branch = content.split("from ")[1]
                
                # Получаем информацию о репозитории
                project_id = task.project_id
                repositories = db.query(Repository).filter(Repository.project_id == project_id).all()
                
                for repo in repositories:
                    repo_path = get_repo_path(repo.id)
                    if not repo_path.exists():
                        continue
                    
                    git_repo = git.Repo(repo_path)
                    
                    # Проверяем существование ветки в репозитории
                    if branch_name not in [head.name for head in git_repo.heads]:
                        continue
                    
                    result.append({
                        "branch_name": branch_name,
                        "repository_id": repo.id,
                        "repository_name": repo.name,
                        "created_at": comment.created_at.isoformat(),
                        "base_branch": base_branch
                    })
            except (IndexError, ValueError, git.GitCommandError):
                continue
        
        return result
    
    except Exception as e:
        print(f"Error getting task branches: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting task branches: {str(e)}"
        )


@router.get("/{task_id}/commits")
async def get_branch_commits(
    task_id: str,
    repository_id: str,
    branch: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get commits from a specific branch related to a task
    """
    try:
        # Проверяем существование задачи
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        
        # Проверяем доступ к репозиторию
        repository = check_repository_access(repository_id, str(current_user.id), db)
        repo_path = get_repo_path(repository_id)
        
        if not repo_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Repository directory not found"
            )
        
        # Открываем репозиторий
        repo = git.Repo(repo_path)
        
        # Проверяем существование ветки
        if branch not in [head.name for head in repo.heads]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Branch '{branch}' not found"
            )
        
        # Получаем коммиты
        commits = []
        base_branch = None
        
        # Находим комментарий с информацией о создании ветки, чтобы определить базовую ветку
        branch_comments = db.query(Comment).filter(
            Comment.task_id == task_id,
            Comment.is_system == True,
            Comment.content.like(f"%Created branch **{branch}**%")
        ).first()
        
        if branch_comments:
            try:
                base_branch = branch_comments.content.split("from ")[1]
            except (IndexError, ValueError):
                pass
        
        # Если не удалось найти базовую ветку, используем стандартную
        if not base_branch or base_branch not in [head.name for head in repo.heads]:
            for default_branch in ['main', 'master']:
                if default_branch in [head.name for head in repo.heads]:
                    base_branch = default_branch
                    break
            
            if not base_branch:
                base_branch = repo.heads[0].name
        
        # Получаем коммиты, уникальные для этой ветки (т.е. отсутствующие в базовой ветке)
        try:
            git_commits = list(repo.iter_commits(f"{branch}..{base_branch}", reverse=True))
            for commit in git_commits:
                commits.append(git_schemas.GitCommit(
                    hash=commit.hexsha,
                    short_hash=commit.hexsha[:7],
                    message=commit.message,
                    author_name=commit.author.name,
                    author_email=commit.author.email,
                    date=commit.committed_datetime.isoformat()
                ))
        except git.GitCommandError as e:
            print(f"Git command error: {str(e)}")
        
        # Проверяем, существуют ли системные комментарии для этих коммитов
        for commit in commits:
            comment = db.query(Comment).filter(
                Comment.task_id == task_id,
                Comment.is_system == True,
                Comment.content.like(f"%Commit {commit.short_hash}%")
            ).first()
            
            # Если комментария нет, создаем его
            if not comment:
                new_comment = Comment(
                    id=str(uuid.uuid4()),
                    task_id=task_id,
                    user_id=current_user.id,
                    content=f"📝 New commit **{commit.short_hash}** on branch **{branch}**:\n\n> {commit.message}",
                    is_system=True,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                db.add(new_comment)
        
        # Сохраняем изменения в базе данных
        db.commit()
        
        return commits
    
    except Exception as e:
        print(f"Error getting branch commits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting branch commits: {str(e)}"
        )


# Webhook для обновления задачи при новых коммитах
@router.post("/webhook/{repository_id}")
async def git_webhook(
    repository_id: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Webhook для получения обновлений от Git-серверов (например, GitHub, GitLab)
    """
    try:
        # Получаем информацию о репозитории
        repository = db.query(Repository).filter(Repository.id == repository_id).first()
        if not repository:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
        
        # Обрабатываем хуки от разных провайдеров
        event_type = payload.get("event_type") or ""
        
        if "push" in event_type.lower():
            ref = payload.get("ref", "")
            branch = ref.replace("refs/heads/", "")
            
            # Находим все задачи, связанные с этой веткой через комментарии
            branch_comments = db.query(Comment).filter(
                Comment.is_system == True,
                Comment.content.like(f"%Created branch **{branch}**%")
            ).all()
            
            task_ids = [comment.task_id for comment in branch_comments]
            
            # Получаем список коммитов из хука
            commits = payload.get("commits", [])
            
            # Для каждой задачи и каждого коммита создаем системный комментарий
            for task_id in task_ids:
                for commit in commits:
                    # Проверяем, существует ли уже комментарий для этого коммита
                    comment = db.query(Comment).filter(
                        Comment.task_id == task_id,
                        Comment.is_system == True,
                        Comment.content.like(f"%Commit {commit.get('id')[:7]}%")
                    ).first()
                    
                    if not comment:
                        # Получаем служебного пользователя (например, admin)
                        system_user = db.query(User).filter(User.username == "system").first()
                        if not system_user:
                            # Если нет системного пользователя, используем первого админа
                            system_user = db.query(User).filter(User.is_superuser == True).first()
                        
                        if system_user:
                            # Создаем комментарий
                            new_comment = Comment(
                                id=str(uuid.uuid4()),
                                task_id=task_id,
                                user_id=system_user.id,
                                content=f"📝 New commit **{commit.get('id')[:7]}** on branch **{branch}**:\n\n> {commit.get('message')}",
                                is_system=True,
                                created_at=datetime.now(),
                                updated_at=datetime.now()
                            )
                            db.add(new_comment)
            
            db.commit()
            
        return {"status": "success"}
    
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing webhook: {str(e)}"
        )
