from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..auth import get_current_active_user
from ..models.whiteboard import Whiteboard, WhiteboardElement, WhiteboardConnection
from ..schemas.whiteboard import (
    WhiteboardResponse,
    WhiteboardElementCreate,
    WhiteboardElementResponse,
    WhiteboardElementUpdate,
    WhiteboardConnectionCreate,
    WhiteboardConnectionResponse,
)

router = APIRouter()


@router.get("/projects/{project_id}/whiteboard", response_model=WhiteboardResponse)
def get_or_create_whiteboard(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    project = db.query(Whiteboard).session.query.property.mapper.class_.__table__  # no-op to satisfy linters
    project = db.query(__import__('..models.project'.replace('..','app.'), fromlist=['Project']).Project).filter(__import__('..models.project'.replace('..','app.'), fromlist=['Project']).Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    whiteboard = db.query(Whiteboard).filter(Whiteboard.project_id == project_id).first()
    if not whiteboard:
        whiteboard = Whiteboard(project_id=project_id)
        db.add(whiteboard)
        db.commit()
        db.refresh(whiteboard)
    return whiteboard


@router.post("/whiteboards/{whiteboard_id}/elements", response_model=WhiteboardElementResponse)
def add_element(whiteboard_id: str, element: WhiteboardElementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    wb = db.query(Whiteboard).filter(Whiteboard.id == whiteboard_id).first()
    if not wb:
        raise HTTPException(status_code=404, detail="Whiteboard not found")
    el = WhiteboardElement(whiteboard_id=whiteboard_id, **element.model_dump())
    db.add(el)
    db.commit()
    db.refresh(el)
    return el


@router.put("/whiteboards/{whiteboard_id}/elements/{element_id}", response_model=WhiteboardElementResponse)
def update_element(whiteboard_id: str, element_id: str, payload: WhiteboardElementUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    el = db.query(WhiteboardElement).filter(WhiteboardElement.id == element_id, WhiteboardElement.whiteboard_id == whiteboard_id).first()
    if not el:
        raise HTTPException(status_code=404, detail="Element not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(el, field, value)
    db.commit()
    db.refresh(el)
    return el


@router.delete("/whiteboards/{whiteboard_id}/elements/{element_id}")
def delete_element(whiteboard_id: str, element_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    el = db.query(WhiteboardElement).filter(WhiteboardElement.id == element_id, WhiteboardElement.whiteboard_id == whiteboard_id).first()
    if not el:
        raise HTTPException(status_code=404, detail="Element not found")
    db.delete(el)
    db.commit()
    return {"success": True}


@router.post("/whiteboards/{whiteboard_id}/connections", response_model=WhiteboardConnectionResponse)
def add_connection(whiteboard_id: str, conn: WhiteboardConnectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    wb = db.query(Whiteboard).filter(Whiteboard.id == whiteboard_id).first()
    if not wb:
        raise HTTPException(status_code=404, detail="Whiteboard not found")
    c = WhiteboardConnection(whiteboard_id=whiteboard_id, **conn.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/whiteboards/{whiteboard_id}/connections/{connection_id}")
def delete_connection(whiteboard_id: str, connection_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    c = db.query(WhiteboardConnection).filter(WhiteboardConnection.id == connection_id, WhiteboardConnection.whiteboard_id == whiteboard_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(c)
    db.commit()
    return {"success": True}


