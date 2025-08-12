from fastapi import APIRouter, Depends, HTTPException, status
from ..dependencies import get_current_user, get_db
from sqlalchemy.orm import Session
from .. import models, schemas
from typing import List
from .comments import get_comments_for_task
from sqlalchemy import and_
from ..utils.telegram_notify import send_telegram_message_safe

router = APIRouter(
    tags=["tasks"]
)


@router.post("/tasks", response_model=schemas.Task)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование колонки
    column = db.query(models.TaskColumn).filter(models.TaskColumn.id == task.column_id).first()
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Column not found"
        )
    
    # Проверяем, что колонка принадлежит указанному проекту
    if column.project_id != task.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Column does not belong to this project"
        )
    
    # Проверяем права доступа
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
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
    
    # Получаем максимальный порядковый номер задач в колонке
    max_order = db.query(models.Task).filter(
        models.Task.column_id == task.column_id
    ).count()
    
    # Создаем задачу
    db_task = models.Task(
        title=task.title,
        description=task.description,
        column_id=task.column_id,
        project_id=task.project_id,
        order=task.order if task.order is not None else max_order
    )
    
    # Reviewer
    if task.reviewer_id:
        reviewer = db.query(models.User).filter(models.User.id == task.reviewer_id).first()
        if not reviewer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reviewer not found")
        db_task.reviewer_id = task.reviewer_id

    # optional time-related fields
    try:
        if getattr(task, 'estimate_hours', None) is not None:
            db_task.estimate_hours = task.estimate_hours
        if getattr(task, 'due_date', None) is not None:
            db_task.due_date = task.due_date
    except Exception:
        pass

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Добавляем исполнителей, если они указаны
    if task.assignee_ids:
        for user_id in task.assignee_ids:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                db_task.assignees.append(user)
                if user.telegram_id:
                    try:
                        send_telegram_message_safe(user.telegram_id, f"Новая задача: {db_task.title}")
                    except Exception:
                        pass
        
        db.commit()
        db.refresh(db_task)
    
    return db_task


@router.get("/tasks/{task_id}", response_model=schemas.Task)
def read_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Проверяем права доступа
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
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
            detail="You don't have permission to access this task"
        )
    
    return task


@router.get("/tasks/column/{column_id}", response_model=List[schemas.Task])
def read_column_tasks(
    column_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование колонки
    column = db.query(models.TaskColumn).filter(models.TaskColumn.id == column_id).first()
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found"
        )
    
    # Проверяем права доступа
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
            detail="You don't have permission to access tasks in this column"
        )
    
    # Получаем задачи, отсортированные по порядку
    tasks = db.query(models.Task).filter(
        models.Task.column_id == column_id
    ).order_by(models.Task.order).all()
    
    return tasks


@router.get("/tasks/project/{project_id}", response_model=List[schemas.Task])
def read_project_tasks(
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
    
    # Проверяем права доступа
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
            detail="You don't have permission to access tasks in this project"
        )
    
    # Получаем все задачи проекта, отсортированные по колонкам и порядку внутри колонки
    tasks = db.query(models.Task).filter(
        models.Task.project_id == project_id
    ).order_by(models.Task.column_id, models.Task.order).all()
    
    return tasks


@router.put("/tasks/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: str,
    task_update: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование задачи
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Проверяем права доступа
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
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
            detail="You don't have permission to modify this task"
        )
    
    # Обновляем поля задачи
    if task_update.title is not None:
        task.title = task_update.title
    
    if task_update.description is not None:
        task.description = task_update.description
    
    if task_update.column_id is not None:
        # Проверяем существование новой колонки и её принадлежность к проекту
        new_column = db.query(models.TaskColumn).filter(
            models.TaskColumn.id == task_update.column_id,
            models.TaskColumn.project_id == task.project_id
        ).first()
        
        if not new_column:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Column not found or does not belong to this project"
            )
        
        task.column_id = task_update.column_id
    
    if task_update.order is not None:
        task.order = task_update.order

    # time-related fields
    if task_update.estimate_hours is not None:
        task.estimate_hours = task_update.estimate_hours
    if task_update.due_date is not None:
        task.due_date = task_update.due_date
    
    # Обновляем исполнителей
    if task_update.assignee_ids is not None:
        # Вычислим добавленных
        current_ids = {u.id for u in task.assignees}
        new_ids = set(task_update.assignee_ids or [])
        # Удалить снятых
        task.assignees = [u for u in task.assignees if u.id in new_ids]
        # Добавить новых
        added_ids = new_ids - current_ids
        for user_id in added_ids:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                task.assignees.append(user)
                if user.telegram_id:
                    try:
                        send_telegram_message_safe(user.telegram_id, f"Вам назначили задачу: {task.title}")
                    except Exception:
                        pass
    
    # Обновляем ревьюера
    if task_update.reviewer_id is not None:
        if task_update.reviewer_id == "":
            task.reviewer_id = None
        else:
            reviewer = db.query(models.User).filter(models.User.id == task_update.reviewer_id).first()
            if not reviewer:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reviewer not found")
            task.reviewer_id = task_update.reviewer_id
            if reviewer.telegram_id:
                try:
                    send_telegram_message_safe(reviewer.telegram_id, f"Вы назначены ревьюером задачи: {task.title}")
                except Exception:
                    pass
    
    db.commit()
    db.refresh(task)
    
    return task


@router.put("/tasks/{task_id}/move", response_model=schemas.Task)
def move_task(
    task_id: str,
    move_data: schemas.TaskMoveUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование задачи
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Проверяем права доступа
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
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
            detail="You don't have permission to move this task"
        )
    
    # Проверяем существование целевой колонки
    target_column = db.query(models.TaskColumn).filter(
        models.TaskColumn.id == move_data.column_id,
        models.TaskColumn.project_id == task.project_id
    ).first()
    
    if not target_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target column not found or does not belong to the task's project"
        )
    
    # Сохраняем старую колонку для реорганизации
    old_column_id = task.column_id
    
    # Обновляем колонку и порядок задачи
    task.column_id = move_data.column_id
    task.order = move_data.order
    
    # Если задача перемещена в другую колонку, обновляем порядок задач в новой колонке
    if old_column_id != move_data.column_id:
        # Получаем задачи в целевой колонке после текущего порядка
        tasks_to_reorder = db.query(models.Task).filter(
            models.Task.column_id == move_data.column_id,
            models.Task.order >= move_data.order,
            models.Task.id != task_id
        ).order_by(models.Task.order).all()
        
        # Сдвигаем их вниз на 1 позицию
        current_order = move_data.order + 1
        for t in tasks_to_reorder:
            t.order = current_order
            current_order += 1
    
    db.commit()
    db.refresh(task)
    
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование задачи
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Проверяем права доступа
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
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
            detail="You don't have permission to delete this task"
        )
    
    # Удаляем задачу
    db.delete(task)
    db.commit()
    
    return None


@router.put("/tasks/column/{column_id}/reorder", response_model=List[schemas.Task])
def reorder_tasks(
    column_id: str,
    task_ids: List[str],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Проверяем существование колонки
    column = db.query(models.TaskColumn).filter(models.TaskColumn.id == column_id).first()
    if not column:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Column not found"
        )
    
    # Проверяем права доступа
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
            detail="You don't have permission to reorder tasks in this column"
        )
    
    # Получаем все задачи в колонке
    tasks = db.query(models.Task).filter(models.Task.column_id == column_id).all()
    task_dict = {task.id: task for task in tasks}
    
    # Проверяем, что все ID задач принадлежат этой колонке
    for task_id in task_ids:
        if task_id not in task_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task with id {task_id} does not belong to this column"
            )
    
    # Обновляем порядок задач
    for i, task_id in enumerate(task_ids):
        task_dict[task_id].order = i
    
    db.commit()
    
    # Возвращаем обновленный список задач
    updated_tasks = db.query(models.Task).filter(
        models.Task.column_id == column_id
    ).order_by(models.Task.order).all()
    
    return updated_tasks


@router.get("/tasks/{task_id}/comments", response_model=List[schemas.Comment])
def get_task_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Получение комментариев к задаче
    """
    return get_comments_for_task(task_id, db, current_user)
