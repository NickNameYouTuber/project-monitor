from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectStatus
from ..models.project import Project
from ..models.user import User
from ..models.dashboard import Dashboard
from ..auth import get_current_active_user
import uuid

router = APIRouter()


@router.get("/", response_model=List[ProjectResponse])
async def read_projects(skip: int = 0, limit: int = 100, 
                       dashboard_id: str = None,
                       current_user: User = Depends(get_current_active_user),
                       db: Session = Depends(get_db)):
    from sqlalchemy import or_
    from ..models.dashboard_member import DashboardMember
    
    # Получаем ID дашбордов, в которых пользователь является участником
    dashboards_as_member = db.query(DashboardMember.dashboard_id).filter(
        DashboardMember.user_id == current_user.id,
        DashboardMember.is_active == True
    ).all()
    
    dashboard_ids = [d[0] for d in dashboards_as_member]
    
    # Основной запрос
    query = db.query(Project)
    
    # Базовый фильтр доступа: пользователь должен быть владельцем или участником дашборда
    # с которым связан проект
    access_filter = or_(
        Project.owner_id == current_user.id,
        Project.dashboard_id.in_(dashboard_ids)
    )
    
    query = query.filter(access_filter)
    
    # Если указан dashboard_id, дополнительно фильтруем проекты только для этого дашборда
    if dashboard_id:
        query = query.filter(Project.dashboard_id == dashboard_id)
    
    # Применяем пагинацию
    projects = query.offset(skip).limit(limit).all()
    
    return projects


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate,
                        current_user: User = Depends(get_current_active_user),
                        db: Session = Depends(get_db)):
    # Validate dashboard_id if provided
    if project.dashboard_id:
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == project.dashboard_id,
            Dashboard.owner_id == current_user.id
        ).first()
        if not dashboard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dashboard not found or you don't have access to it"
            )
    
    # Create new project
    db_project = Project(
        id=str(uuid.uuid4()),
        name=project.name,
        description=project.description,
        status=project.status.value,
        priority=project.priority.value,
        assignee=project.assignee,
        order=project.order,
        owner_id=current_user.id,
        dashboard_id=project.dashboard_id
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project


@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(project_id: str,
                      current_user: User = Depends(get_current_active_user),
                      db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str,
                         project_update: ProjectUpdate,
                         current_user: User = Depends(get_current_active_user),
                         db: Session = Depends(get_db)):
    # Get the project
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update project fields
    if project_update.name is not None:
        db_project.name = project_update.name
    
    if project_update.description is not None:
        db_project.description = project_update.description
    
    if project_update.status is not None:
        db_project.status = project_update.status.value
    
    if project_update.priority is not None:
        db_project.priority = project_update.priority.value
    
    if project_update.assignee is not None:
        db_project.assignee = project_update.assignee
    
    if project_update.order is not None:
        db_project.order = project_update.order
        
    if project_update.dashboard_id is not None:
        # Validate dashboard_id if provided
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == project_update.dashboard_id,
            Dashboard.owner_id == current_user.id
        ).first()
        if not dashboard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dashboard not found or you don't have access to it"
            )
        db_project.dashboard_id = project_update.dashboard_id
    
    db.commit()
    db.refresh(db_project)
    
    return db_project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str,
                        current_user: User = Depends(get_current_active_user),
                        db: Session = Depends(get_db)):
    # Get the project
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete the project
    db.delete(db_project)
    db.commit()
    
    return None


# Define status update request model
class StatusUpdateRequest(BaseModel):
    status: str
    

@router.patch("/{project_id}/status", response_model=ProjectResponse)
async def update_project_status(project_id: str,
                              status_update: StatusUpdateRequest,
                              current_user: User = Depends(get_current_active_user),
                              db: Session = Depends(get_db)):
    # Get the project
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate status value
    try:
        new_status = ProjectStatus(status_update.status)
        db_project.status = new_status.value
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status value. Valid values are: {', '.join([s.value for s in ProjectStatus])}"
        )
    
    # Update the order to be last in the new status column
    projects_same_status = db.query(Project).filter(
        Project.owner_id == current_user.id,
        Project.status == new_status.value
    ).all()
    
    max_order = max([p.order for p in projects_same_status], default=-1)
    db_project.order = max_order + 1
    
    db.commit()
    db.refresh(db_project)
    
    return db_project


# Define reorder request model
class ReorderRequest(BaseModel):
    projectId: str
    targetProjectId: str
    position: str  # 'above' or 'below'
    

@router.post("/reorder", response_model=Dict[str, Any])
async def reorder_projects(reorder_data: ReorderRequest,
                          current_user: User = Depends(get_current_active_user),
                          db: Session = Depends(get_db)):
    # Get the dragged project
    dragged_project = db.query(Project).filter(
        Project.id == reorder_data.projectId,
        Project.owner_id == current_user.id
    ).first()
    
    if dragged_project is None:
        raise HTTPException(status_code=404, detail="Dragged project not found")
    
    # Get the target project
    target_project = db.query(Project).filter(
        Project.id == reorder_data.targetProjectId,
        Project.owner_id == current_user.id
    ).first()
    
    if target_project is None:
        raise HTTPException(status_code=404, detail="Target project not found")
    
    # Get all projects in the target status column
    projects_same_status = db.query(Project).filter(
        Project.owner_id == current_user.id,
        Project.status == target_project.status
    ).order_by(Project.order).all()
    
    # If the dragged project is from another status, update its status
    if dragged_project.status != target_project.status:
        dragged_project.status = target_project.status
    
    # Remove dragged project from the list
    projects_same_status = [p for p in projects_same_status if p.id != dragged_project.id]
    
    # Find the target index
    target_idx = next((i for i, p in enumerate(projects_same_status) if p.id == target_project.id), -1)
    
    # Determine insertion position
    if reorder_data.position == "above":
        insert_idx = target_idx
    elif reorder_data.position == "below":
        insert_idx = target_idx + 1
    else:
        raise HTTPException(status_code=400, detail="Invalid position value. Use 'above' or 'below'.")
    
    # Insert the dragged project at the new position
    projects_same_status.insert(insert_idx, dragged_project)
    
    # Update order for all projects in the status column
    for i, project in enumerate(projects_same_status):
        project.order = i
    
    db.commit()
    
    # Return success response
    return {"success": True, "message": "Projects reordered successfully"}
