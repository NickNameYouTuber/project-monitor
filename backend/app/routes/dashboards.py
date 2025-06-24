from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.dashboard import DashboardCreate, DashboardResponse, DashboardUpdate, DashboardDetailResponse
from ..models.dashboard import Dashboard
from ..models.user import User
from ..auth import get_current_active_user
import uuid

router = APIRouter()


@router.get("/", response_model=List[DashboardResponse])
async def read_dashboards(skip: int = 0, limit: int = 100,
                        current_user: User = Depends(get_current_active_user),
                        db: Session = Depends(get_db)):
    dashboards = db.query(Dashboard).filter(Dashboard.owner_id == current_user.id)\
                .offset(skip).limit(limit).all()
    return dashboards


@router.post("/", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(dashboard: DashboardCreate,
                          current_user: User = Depends(get_current_active_user),
                          db: Session = Depends(get_db)):
    # Create new dashboard
    db_dashboard = Dashboard(
        id=str(uuid.uuid4()),
        name=dashboard.name,
        description=dashboard.description,
        owner_id=current_user.id
    )
    
    db.add(db_dashboard)
    db.commit()
    db.refresh(db_dashboard)
    
    return db_dashboard


@router.get("/{dashboard_id}", response_model=DashboardDetailResponse)
async def read_dashboard(dashboard_id: str,
                        current_user: User = Depends(get_current_active_user),
                        db: Session = Depends(get_db)):
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    return dashboard


@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(dashboard_id: str,
                          dashboard_update: DashboardUpdate,
                          current_user: User = Depends(get_current_active_user),
                          db: Session = Depends(get_db)):
    # Get the dashboard
    db_dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if db_dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Update dashboard fields
    if dashboard_update.name is not None:
        db_dashboard.name = dashboard_update.name
    
    if dashboard_update.description is not None:
        db_dashboard.description = dashboard_update.description
    
    db.commit()
    db.refresh(db_dashboard)
    
    return db_dashboard


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(dashboard_id: str,
                          current_user: User = Depends(get_current_active_user),
                          db: Session = Depends(get_db)):
    # Get the dashboard
    db_dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.owner_id == current_user.id
    ).first()
    
    if db_dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Delete the dashboard (this will cascade delete all associated projects too)
    db.delete(db_dashboard)
    db.commit()
    
    return None
