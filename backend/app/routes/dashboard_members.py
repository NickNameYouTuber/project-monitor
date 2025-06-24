from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.dashboard_member import (DashboardMemberCreate, DashboardMemberResponse, 
                                      DashboardMemberUpdate, DashboardMemberDetailResponse, DashboardInviteByTelegram)
from ..models.dashboard_member import DashboardMember
from ..models.dashboard import Dashboard
from ..models.user import User
from ..auth import get_current_active_user
import uuid

router = APIRouter()


@router.get("/{dashboard_id}/members", response_model=List[DashboardMemberDetailResponse])
async def read_dashboard_members(dashboard_id: str,
                              current_user: User = Depends(get_current_active_user),
                              db: Session = Depends(get_db)):
    # Verify user has access to this dashboard
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Check if user is owner or member
    if dashboard.owner_id != current_user.id:
        member = db.query(DashboardMember).filter(
            DashboardMember.dashboard_id == dashboard_id,
            DashboardMember.user_id == current_user.id,
            DashboardMember.is_active == True
        ).first()
        
        if member is None:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get all members
    members = db.query(DashboardMember).filter(
        DashboardMember.dashboard_id == dashboard_id,
        DashboardMember.is_active == True
    ).all()
    
    return members


@router.post("/{dashboard_id}/members", response_model=DashboardMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_dashboard_member(dashboard_id: str,
                             member: DashboardMemberCreate,
                             current_user: User = Depends(get_current_active_user),
                             db: Session = Depends(get_db)):
    # Verify user has access to add members to this dashboard
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Only owner can add members
    if dashboard.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Verify user exists
    user_to_add = db.query(User).filter(User.id == member.user_id).first()
    if user_to_add is None:
        raise HTTPException(status_code=404, detail="User to add not found")
    
    # Check if member already exists
    existing_member = db.query(DashboardMember).filter(
        DashboardMember.dashboard_id == dashboard_id,
        DashboardMember.user_id == member.user_id
    ).first()
    
    if existing_member:
        if existing_member.is_active:
            raise HTTPException(status_code=400, detail="User is already a member of this dashboard")
        else:
            # Reactivate member
            existing_member.is_active = True
            existing_member.role = member.role
            db.commit()
            db.refresh(existing_member)
            return existing_member
    
    # Create new dashboard member
    db_member = DashboardMember(
        id=str(uuid.uuid4()),
        dashboard_id=dashboard_id,
        user_id=member.user_id,
        role=member.role
    )
    
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return db_member


@router.post("/{dashboard_id}/invite-by-telegram", response_model=DashboardMemberResponse, status_code=status.HTTP_201_CREATED)
async def invite_by_telegram_id(dashboard_id: str,
                             invite: DashboardInviteByTelegram,
                             current_user: User = Depends(get_current_active_user),
                             db: Session = Depends(get_db)):
    # Verify user has access to add members to this dashboard
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Only owner can add members
    if dashboard.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Find user by Telegram ID
    user_to_add = db.query(User).filter(User.telegram_id == invite.telegram_id).first()
    if user_to_add is None:
        raise HTTPException(status_code=404, detail="User with this Telegram ID not found")
    
    # Check if member already exists
    existing_member = db.query(DashboardMember).filter(
        DashboardMember.dashboard_id == dashboard_id,
        DashboardMember.user_id == user_to_add.id
    ).first()
    
    if existing_member:
        if existing_member.is_active:
            raise HTTPException(status_code=400, detail="User is already a member of this dashboard")
        else:
            # Reactivate member
            existing_member.is_active = True
            existing_member.role = invite.role
            db.commit()
            db.refresh(existing_member)
            return existing_member
    
    # Create new dashboard member
    db_member = DashboardMember(
        id=str(uuid.uuid4()),
        dashboard_id=dashboard_id,
        user_id=user_to_add.id,
        role=invite.role
    )
    
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return db_member


@router.delete("/{dashboard_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_dashboard_member(dashboard_id: str,
                               member_id: str,
                               current_user: User = Depends(get_current_active_user),
                               db: Session = Depends(get_db)):
    # Verify user has access to remove members from this dashboard
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Only owner can remove members
    if dashboard.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get the member
    db_member = db.query(DashboardMember).filter(
        DashboardMember.id == member_id,
        DashboardMember.dashboard_id == dashboard_id
    ).first()
    
    if db_member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Soft delete the member
    db_member.is_active = False
    db.commit()
    
    return None
