from fastapi import APIRouter, Depends, HTTPException, status
from ..dependencies import get_current_user, get_db
from sqlalchemy.orm import Session
from .. import models, schemas
from typing import List
from sqlalchemy import and_

router = APIRouter(
    tags=["comments"]
)


@router.post("/comments", response_model=schemas.Comment)
def create_comment(
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверка существования задачи
    task = db.query(models.Task).filter(models.Task.id == comment.task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Проверка прав доступа к задаче через проект
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
    has_access = False
    
    # Проверка, является ли пользователь владельцем проекта
    if project.owner_id == current_user.id:
        has_access = True
    
    # Проверка, является ли пользователь членом дашборда, к которому относится проект
    if not has_access and project.dashboard_id:
        dashboard_member = db.query(models.DashboardMember).filter(
            and_(
                models.DashboardMember.dashboard_id == project.dashboard_id,
                models.DashboardMember.user_id == current_user.id
            )
        ).first()
        
        if dashboard_member:
            has_access = True
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Создаем комментарий
    db_comment = models.Comment(
        content=comment.content,
        task_id=comment.task_id,
        user_id=current_user.id
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    # Добавляем username для клиента
    result = {
        **db_comment.__dict__,
        "username": current_user.username
    }
    
    return result


@router.get("/tasks/{task_id}/comments", response_model=List[schemas.Comment])
def get_task_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получение комментариев к задаче через API /api/comments/task/{task_id}"""
    return get_comments_for_task(task_id, db, current_user)


# Дополнительный маршрут для совместимости с фронтендом
@router.get("/tasks/{task_id}/comments", response_model=List[schemas.Comment])
def get_task_comments_alt(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получение комментариев к задаче через API /api/tasks/{task_id}/comments"""
    return get_comments_for_task(task_id, db, current_user)


def get_comments_for_task(
    task_id: str,
    db: Session,
    current_user: models.User
):
    # Проверка существования задачи
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Проверка прав доступа к задаче через проект
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
    has_access = False
    
    # Проверка, является ли пользователь владельцем проекта
    if project.owner_id == current_user.id:
        has_access = True
    
    # Проверка, является ли пользователь членом дашборда, к которому относится проект
    if not has_access and project.dashboard_id:
        dashboard_member = db.query(models.DashboardMember).filter(
            and_(
                models.DashboardMember.dashboard_id == project.dashboard_id,
                models.DashboardMember.user_id == current_user.id
            )
        ).first()
        
        if dashboard_member:
            has_access = True
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Получаем комментарии и добавляем username для каждого
    comments = db.query(models.Comment).filter(models.Comment.task_id == task_id).all()
    
    result = []
    for comment in comments:
        user = db.query(models.User).filter(models.User.id == comment.user_id).first()
        comment_dict = {
            **comment.__dict__,
            "username": user.username if user else "Unknown User"
        }
        result.append(comment_dict)
    
    return result


@router.put("/comments/{comment_id}", response_model=schemas.Comment)
def update_comment(
    comment_id: str,
    comment_update: schemas.CommentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверка существования комментария
    db_comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Проверка, является ли пользователь автором комментария
    if db_comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own comments"
        )
    
    # Обновляем комментарий
    db_comment.content = comment_update.content
    
    db.commit()
    db.refresh(db_comment)
    
    # Добавляем username для клиента
    result = {
        **db_comment.__dict__,
        "username": current_user.username
    }
    
    return result


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверка существования комментария
    db_comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Проверка, является ли пользователь автором комментария
    if db_comment.user_id != current_user.id:
        # Проверяем, является ли пользователь владельцем задачи или проекта
        task = db.query(models.Task).filter(models.Task.id == db_comment.task_id).first()
        project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
        
        if project.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only delete your own comments or as project owner"
            )
    
    # Удаляем комментарий
    db.delete(db_comment)
    db.commit()
    
    return None
