from __future__ import annotations
from typing import Iterable, List, Optional
from ..config import TELEGRAM_BOT_TOKEN
import requests
from sqlalchemy.orm import Session
from ..models.user import User
from ..models.task import Task
from ..models.merge_request import MergeRequest


def _collect_telegram_ids(db: Session, user_ids: Iterable[str]) -> List[int]:
    ids: List[int] = []
    for uid in set(user_ids):
        if not uid:
            continue
        u: Optional[User] = db.query(User).filter(User.id == uid).first()
        if u and getattr(u, 'telegram_id', None):
            try:
                ids.append(int(u.telegram_id))
            except Exception:
                pass
    return ids


def _send_telegram_message(chat_id: int, text: str) -> None:
    if not TELEGRAM_BOT_TOKEN:
        return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=5)
    except Exception:
        # best-effort only
        pass


def notify_task_event_silent(db: Session, task: Task, *, actor_id: Optional[str], action: str, notify_user_ids: Optional[Iterable[str]] = None) -> None:
    """
    Best-effort Telegram notification for task events.
    action: created | updated | moved | deleted
    """
    recipients = list(notify_user_ids or [])
    # actor can receive as well (optional)
    actor: Optional[User] = db.query(User).filter(User.id == actor_id).first() if actor_id else None
    actor_name = actor.username if actor and getattr(actor, 'username', None) else (actor.email if actor and getattr(actor, 'email', None) else 'system')
    text = f"Задача: <b>{task.title}</b> — {action}\nПроект: {task.project_id}"
    if getattr(task, 'due_date', None):
        text += f"\nДедлайн: {task.due_date}"
    if getattr(task, 'estimate_minutes', None) is not None:
        text += f"\nОценка: {task.estimate_minutes} мин"
    text += f"\nОт: {actor_name}"
    chat_ids = _collect_telegram_ids(db, recipients)
    for cid in chat_ids:
        _send_telegram_message(cid, text)


def notify_mr_event_silent(db: Session, mr: MergeRequest, *, actor_id: Optional[str], action: str) -> None:
    actor: Optional[User] = db.query(User).filter(User.id == actor_id).first() if actor_id else None
    actor_name = actor.username if actor and getattr(actor, 'username', None) else (actor.email if actor and getattr(actor, 'email', None) else 'system')
    text = (
        f"MR: <b>{mr.title}</b> — {action}\n"
        f"{mr.source_branch} → {mr.target_branch}\n"
        f"Репозиторий: {mr.repository_id}\n"
        f"От: {actor_name}"
    )
    # For now, only author
    author: Optional[User] = db.query(User).filter(User.id == mr.author_id).first()
    if author and getattr(author, 'telegram_id', None):
        try:
            _send_telegram_message(int(author.telegram_id), text)
        except Exception:
            pass


