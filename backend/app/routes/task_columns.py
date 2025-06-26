from fastapi import APIRouter, Depends, HTTPException, status
from ..dependencies import get_current_user, get_db
from sqlalchemy.orm import Session
from .. import models, schemas
from typing import List

router = APIRouter(
    prefix="/task-columns",
    tags=["task_columns"]
)


@router.post("/", response_model=schemas.TaskColumn)
def create_task_column(
    column: schemas.TaskColumnCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем, существует ли проект и имеет ли пользователь доступ к нему
    project = db.query(models.Project).filter(models.Project.id == column.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Проверка доступа (владелец проекта или участник дашборда)
    is_owner = project.owner_id == current_user.id
    
    is_member = False
    if project.dashboard_id:
        dashboard_member = db.query(models.DashboardMember).filter(
            models.DashboardMember.dashboard_id == project.dashboard_id,
            models.DashboardMember.user_id == current_user.id
        ).first()
        is_member = dashboard_member is not None
    
    if not (is_owner or is_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this project"
        )
    
    # Получаем максимальный порядок существующих колонок
    max_order = db.query(models.TaskColumn).filter(
        models.TaskColumn.project_id == column.project_id
    ).count()
    
    db_column = models.TaskColumn(
        name=column.name, 
        project_id=column.project_id,
        order=column.order if column.order is not None else max_order
    )
    
    db.add(db_column)
    db.commit()
    db.refresh(db_column)
    
    return db_column


@router.get("/{column_id}", response_model=schemas.TaskColumn)
def read_task_column(
    column_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    column = db.query(models.TaskColumn).filter(models.TaskColumn.id == column_id).first()
    
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found"
        )
    
    # Проверка доступа
    project = db.query(models.Project).filter(models.Project.id == column.project_id).first()
    is_owner = project.owner_id == current_user.id
    
    is_member = False
    if project.dashboard_id:
        dashboard_member = db.query(models.DashboardMember).filter(
            models.DashboardMember.dashboard_id == project.dashboard_id,
            models.DashboardMember.user_id == current_user.id
        ).first()
        is_member = dashboard_member is not None
    
    if not (is_owner or is_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this column"
        )
    
    return column


@router.get("/project/{project_id}", response_model=List[schemas.TaskColumn])
def read_project_task_columns(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование проекта
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Проверка доступа
    is_owner = project.owner_id == current_user.id
    
    is_member = False
    if project.dashboard_id:
        dashboard_member = db.query(models.DashboardMember).filter(
            models.DashboardMember.dashboard_id == project.dashboard_id,
            models.DashboardMember.user_id == current_user.id
        ).first()
        is_member = dashboard_member is not None
    
    if not (is_owner or is_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this project"
        )
    
    # Получаем колонки проекта, отсортированные по порядку
    columns = db.query(models.TaskColumn).filter(
        models.TaskColumn.project_id == project_id
    ).order_by(models.TaskColumn.order).all()
    
    return columns


@router.put("/{column_id}", response_model=schemas.TaskColumn)
def update_task_column(
    column_id: str,
    column_update: schemas.TaskColumnUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_column = db.query(models.TaskColumn).filter(models.TaskColumn.id == column_id).first()
    
    if not db_column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found"
        )
    
    # Проверка доступа
    project = db.query(models.Project).filter(models.Project.id == db_column.project_id).first()
    is_owner = project.owner_id == current_user.id
    
    is_member = False
    if project.dashboard_id:
        dashboard_member = db.query(models.DashboardMember).filter(
            models.DashboardMember.dashboard_id == project.dashboard_id,
            models.DashboardMember.user_id == current_user.id
        ).first()
        is_member = dashboard_member is not None
    
    if not (is_owner or is_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this column"
        )
    
    # Обновляем поля колонки
    if column_update.name is not None:
        db_column.name = column_update.name
    
    if column_update.order is not None:
        db_column.order = column_update.order
    
    db.commit()
    db.refresh(db_column)
    
    return db_column


@router.delete("/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_column(
    column_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_column = db.query(models.TaskColumn).filter(models.TaskColumn.id == column_id).first()
    
    if not db_column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found"
        )
    
    # Проверка доступа
    project = db.query(models.Project).filter(models.Project.id == db_column.project_id).first()
    is_owner = project.owner_id == current_user.id
    
    is_member = False
    if project.dashboard_id:
        dashboard_member = db.query(models.DashboardMember).filter(
            models.DashboardMember.dashboard_id == project.dashboard_id,
            models.DashboardMember.user_id == current_user.id
        ).first()
        is_member = dashboard_member is not None
    
    if not (is_owner or is_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this column"
        )
    
    # Удаляем колонку (каскадно удалятся и задачи этой колонки)
    db.delete(db_column)
    db.commit()
    
    return None


@router.put("/reorder/{project_id}", response_model=List[schemas.TaskColumn])
def reorder_task_columns(
    project_id: str,
    column_ids: List[str],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование проекта
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Проверка доступа
    is_owner = project.owner_id == current_user.id
    
    is_member = False
    if project.dashboard_id:
        dashboard_member = db.query(models.DashboardMember).filter(
            models.DashboardMember.dashboard_id == project.dashboard_id,
            models.DashboardMember.user_id == current_user.id
        ).first()
        is_member = dashboard_member is not None
    
    if not (is_owner or is_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this project"
        )
    
    # Получаем все колонки проекта
    columns = db.query(models.TaskColumn).filter(models.TaskColumn.project_id == project_id).all()
    column_dict = {column.id: column for column in columns}
    
    # Проверяем, что все переданные ID существуют в проекте
    for col_id in column_ids:
        if col_id not in column_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column with id {col_id} does not belong to this project"
            )
    
    # Обновляем порядок
    for i, col_id in enumerate(column_ids):
        column_dict[col_id].order = i
    
    db.commit()
    
    # Получаем обновленный список колонок
    updated_columns = db.query(models.TaskColumn).filter(
        models.TaskColumn.project_id == project_id
    ).order_by(models.TaskColumn.order).all()
    
    return updated_columns
