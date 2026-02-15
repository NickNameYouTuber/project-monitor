from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..auth import get_current_user
from ..database import get_db
from ..models import Whiteboard, WhiteboardElement, WhiteboardConnection
from ..schemas.whiteboard import (
    WhiteboardResponse,
    WhiteboardElementCreate,
    WhiteboardElementUpdate,
    WhiteboardElementResponse,
    WhiteboardConnectionCreate,
    WhiteboardConnectionUpdate,
    WhiteboardConnectionResponse,
)

router = APIRouter()


@router.get("/whiteboards", response_model=WhiteboardResponse)
def get_or_create_whiteboard(project_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    board = db.query(Whiteboard).filter(Whiteboard.project_id == project_id).first()
    if not board:
        board = Whiteboard(project_id=project_id)
        db.add(board)
        db.commit()
        db.refresh(board)
    return board


@router.get("/whiteboards/{board_id}", response_model=WhiteboardResponse)
def get_board(board_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    board = db.query(Whiteboard).filter(Whiteboard.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@router.post("/whiteboards/{board_id}/elements", response_model=WhiteboardElementResponse)
def create_element(board_id: str, payload: WhiteboardElementCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    board = db.query(Whiteboard).filter(Whiteboard.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    el = WhiteboardElement(board_id=board_id, **payload.dict())
    db.add(el)
    db.commit()
    db.refresh(el)
    return el


@router.patch("/whiteboard-elements/{element_id}", response_model=WhiteboardElementResponse)
def update_element(element_id: str, payload: WhiteboardElementUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        el = db.query(WhiteboardElement).filter(WhiteboardElement.id == element_id).first()
        if not el:
            raise HTTPException(status_code=404, detail="Element not found")
        
        update_data = payload.dict(exclude_unset=True)
        allowed_fields = {'x', 'y', 'width', 'height', 'rotation', 'z_index', 'text', 'fill', 'text_color', 'font_family', 'font_size'}
        
        for key, value in update_data.items():
            if key in allowed_fields:
                setattr(el, key, value)
        
        db.commit()
        db.refresh(el)
        
        element_dict = {
            'id': el.id,
            'board_id': el.board_id,
            'type': el.type,
            'x': el.x,
            'y': el.y,
            'width': el.width,
            'height': el.height,
            'rotation': el.rotation,
            'z_index': el.z_index,
            'text': el.text,
            'fill': el.fill,
            'text_color': el.text_color,
            'font_family': el.font_family,
            'font_size': el.font_size,
            'created_at': el.created_at,
            'updated_at': el.updated_at
        }
        return WhiteboardElementResponse(**element_dict)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating whiteboard element: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating element: {str(e)}")


@router.delete("/whiteboard-elements/{element_id}")
def delete_element(element_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    el = db.query(WhiteboardElement).filter(WhiteboardElement.id == element_id).first()
    if not el:
        raise HTTPException(status_code=404, detail="Element not found")
    db.delete(el)
    db.commit()
    return {"ok": True}


@router.post("/whiteboards/{board_id}/connections", response_model=WhiteboardConnectionResponse)
def create_connection(board_id: str, payload: WhiteboardConnectionCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    board = db.query(Whiteboard).filter(Whiteboard.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    conn = WhiteboardConnection(board_id=board_id, **payload.dict())
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


@router.patch("/whiteboard-connections/{connection_id}", response_model=WhiteboardConnectionResponse)
def update_connection(connection_id: str, payload: WhiteboardConnectionUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    conn = db.query(WhiteboardConnection).filter(WhiteboardConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(conn, key, value)
    db.commit()
    db.refresh(conn)
    return conn


@router.delete("/whiteboard-connections/{connection_id}")
def delete_connection(connection_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    conn = db.query(WhiteboardConnection).filter(WhiteboardConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(conn)
    db.commit()
    return {"ok": True}


