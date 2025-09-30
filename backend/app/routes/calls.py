from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..dependencies import get_current_user, get_db
from .. import models, schemas

router = APIRouter(tags=["calls"])


@router.post("/calls", response_model=schemas.call.Call)
def create_call(payload: schemas.call.CallCreate, db: Session = Depends(get_db), current_user: models.user.User = Depends(get_current_user)):
    db_call = models.call.Call(
        title=payload.title,
        description=payload.description,
        scheduled_start=payload.scheduled_start,
        duration_minutes=payload.duration_minutes,
        created_by_user_id=current_user.id,
    )
    db.add(db_call)
    # Добавляем участников
    if payload.participant_ids:
        users = db.query(models.user.User).filter(models.user.User.id.in_(payload.participant_ids)).all()
        for u in users:
            db_call.participants.append(u)
    db.commit()
    db.refresh(db_call)
    return db_call


@router.get("/calls", response_model=List[schemas.call.Call])
def list_calls(db: Session = Depends(get_db), current_user: models.user.User = Depends(get_current_user)):
    # Простая выборка всех звонков, где пользователь создатель или участник
    q = db.query(models.call.Call)
    calls = q.all()
    return calls


@router.get("/calls/{call_id}", response_model=schemas.call.Call)
def get_call(call_id: str, db: Session = Depends(get_db), current_user: models.user.User = Depends(get_current_user)):
    c = db.query(models.call.Call).filter(models.call.Call.id == call_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    return c


@router.put("/calls/{call_id}", response_model=schemas.call.Call)
def update_call(call_id: str, payload: schemas.call.CallUpdate, db: Session = Depends(get_db), current_user: models.user.User = Depends(get_current_user)):
    c = db.query(models.call.Call).filter(models.call.Call.id == call_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    if payload.title is not None:
        c.title = payload.title
    if payload.description is not None:
        c.description = payload.description
    if payload.scheduled_start is not None:
        c.scheduled_start = payload.scheduled_start
    if payload.duration_minutes is not None:
        c.duration_minutes = payload.duration_minutes
    if payload.participant_ids is not None:
        c.participants = []
        users = db.query(models.user.User).filter(models.user.User.id.in_(payload.participant_ids)).all()
        for u in users:
            c.participants.append(u)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/calls/{call_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_call(call_id: str, db: Session = Depends(get_db), current_user: models.user.User = Depends(get_current_user)):
    c = db.query(models.call.Call).filter(models.call.Call.id == call_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    db.delete(c)
    db.commit()
    return None


