from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from ..database import get_db
from ..auth import get_current_active_user
from ..models import Repository, RepositoryMember, User
from ..models.merge_request import MergeRequest, MergeRequestStatus, MergeRequestApproval, MergeRequestComment
from ..utils.telegram_notify import send_telegram_message_safe
from .. import schemas
from ..routes.repository_content import get_repo_path, check_repository_access
import git
import os

router = APIRouter()


def _user_display_name(user: Optional[User], *, fallback_id: Optional[str] = None, is_self: bool = False) -> str:
    if user is None:
        base = (fallback_id[:8] if fallback_id else "unknown")
        return f"Гость-{base}{' (Вы)' if is_self else ''}"
    if getattr(user, "username", None):
        return f"{user.username}{' (Вы)' if is_self else ''}"
    first = getattr(user, "first_name", None) or ""
    last = getattr(user, "last_name", None) or ""
    full = (first + " " + last).strip()
    if full:
        return f"{full}{' (Вы)' if is_self else ''}"
    if getattr(user, "email", None):
        return f"{user.email}{' (Вы)' if is_self else ''}"
    base = (fallback_id[:8] if fallback_id else "unknown")
    return f"Гость-{base}{' (Вы)' if is_self else ''}"

@router.get("/repositories/{repository_id}/merge_requests", response_model=List[schemas.merge_request.MergeRequest])
def list_merge_requests(repository_id: str, status: Optional[str] = None, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    q = db.query(MergeRequest).filter(MergeRequest.repository_id == repository_id)
    if status in {s.value for s in MergeRequestStatus}:
        q = q.filter(MergeRequest.status == status)
    items = q.order_by(MergeRequest.created_at.desc()).all()
    return items


@router.post("/repositories/{repository_id}/merge_requests", response_model=schemas.merge_request.MergeRequest)
def create_merge_request(repository_id: str, payload: schemas.merge_request.MergeRequestCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    # Validate branches exist
    repo_path = get_repo_path(repository_id)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository directory not found")
    repo = git.Repo(repo_path)
    heads = [h.name for h in repo.heads]
    if payload.source_branch not in heads or payload.target_branch not in heads:
        raise HTTPException(status_code=400, detail="Branch not found")

    mr = MergeRequest(
        repository_id=repository_id,
        author_id=current_user.id,
        title=payload.title,
        description=payload.description,
        source_branch=payload.source_branch,
        target_branch=payload.target_branch,
        status=MergeRequestStatus.OPEN,
    )
    db.add(mr)
    db.commit()
    db.refresh(mr)
    # Notify repository members except author (best effort)
    try:
        members = db.query(RepositoryMember).filter(RepositoryMember.repository_id == repository_id).all()
        for m in members:
            try:
                user = db.query(User).filter(User.id == m.user_id).first()
                if user and user.id != current_user.id and getattr(user, 'telegram_id', None):
                    send_telegram_message_safe(user.telegram_id, f"Новый MR: {payload.title} ({payload.source_branch} → {payload.target_branch})")
            except Exception:
                pass
    except Exception:
        pass
    return mr


@router.get("/repositories/{repository_id}/merge_requests/{mr_id}", response_model=schemas.merge_request.MergeRequestDetail)
def get_merge_request(repository_id: str, mr_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    mr = db.query(MergeRequest).filter(MergeRequest.id == mr_id, MergeRequest.repository_id == repository_id).first()
    if not mr:
        raise HTTPException(status_code=404, detail="Merge Request not found")
    # approvals with user name
    approvals = db.query(MergeRequestApproval).filter(MergeRequestApproval.merge_request_id == mr.id).all()
    detail = schemas.merge_request.MergeRequestDetail(
        **{k: getattr(mr, k) for k in ['id','repository_id','author_id','title','description','source_branch','target_branch','status','created_at','updated_at']},
        approvals=[
            schemas.merge_request.MergeRequestApprovalWithUser(
                id=a.id,
                merge_request_id=a.merge_request_id,
                user_id=a.user_id,
                user_name=_user_display_name(
                    db.query(User).filter(User.id == a.user_id).first(),
                    fallback_id=str(a.user_id),
                    is_self=(str(a.user_id) == str(current_user.id))
                ) if a.user_id else _user_display_name(None, fallback_id=None),
                created_at=a.created_at
            ) for a in approvals
        ]
    )
    return detail


@router.post("/repositories/{repository_id}/merge_requests/{mr_id}/approve", response_model=schemas.merge_request.MergeRequestApproval)
def approve_merge_request(repository_id: str, mr_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    mr = db.query(MergeRequest).filter(MergeRequest.id == mr_id, MergeRequest.repository_id == repository_id).first()
    if not mr or mr.status != MergeRequestStatus.OPEN:
        raise HTTPException(status_code=400, detail="Cannot approve")
    # Prevent duplicate approval
    existing = db.query(MergeRequestApproval).filter(MergeRequestApproval.merge_request_id == mr_id, MergeRequestApproval.user_id == current_user.id).first()
    if existing:
        return existing
    approval = MergeRequestApproval(merge_request_id=mr_id, user_id=current_user.id)
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return approval


@router.post("/repositories/{repository_id}/merge_requests/{mr_id}/unapprove")
def unapprove_merge_request(repository_id: str, mr_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    mr = db.query(MergeRequest).filter(MergeRequest.id == mr_id, MergeRequest.repository_id == repository_id).first()
    if not mr or mr.status != MergeRequestStatus.OPEN:
        raise HTTPException(status_code=400, detail="Cannot unapprove")
    existing = db.query(MergeRequestApproval).filter(
        MergeRequestApproval.merge_request_id == mr_id,
        MergeRequestApproval.user_id == current_user.id
    ).first()
    if not existing:
        return {"status": "noop"}
    db.delete(existing)
    db.commit()
    return {"status": "ok"}


@router.post("/repositories/{repository_id}/merge_requests/{mr_id}/merge", response_model=schemas.merge_request.MergeRequest)
def merge_merge_request(repository_id: str, mr_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    repo_path = get_repo_path(repository_id)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository directory not found")
    repo = git.Repo(repo_path)

    mr = db.query(MergeRequest).filter(MergeRequest.id == mr_id, MergeRequest.repository_id == repository_id).first()
    if not mr or mr.status != MergeRequestStatus.OPEN:
        raise HTTPException(status_code=400, detail="Cannot merge")

    # Simple fast-forward or merge commit
    try:
        # Resolve objects for snapshot
        source_commit = repo.heads[mr.source_branch].commit
        target_commit = repo.heads[mr.target_branch].commit
        bases = repo.merge_base(target_commit, source_commit)
        base_commit = bases[0] if isinstance(bases, (list, tuple)) and bases else bases

        # Checkout target and merge
        repo.git.checkout(mr.target_branch)
        repo.git.merge(mr.source_branch, '--no-ff')

        # After merge, get merge commit
        merge_commit = repo.head.commit

        # Persist snapshot SHAs - DISABLED FOR NOW
        # mr.base_sha_at_merge = base_commit.hexsha if base_commit else None
        # mr.source_sha_at_merge = source_commit.hexsha
        # mr.target_sha_at_merge = target_commit.hexsha
        # mr.merge_commit_sha = merge_commit.hexsha
        mr.status = MergeRequestStatus.MERGED
        # mr.updated_at = merge_commit.committed_datetime
        # mr.merged_at = merge_commit.committed_datetime
    except git.GitCommandError as e:
        raise HTTPException(status_code=400, detail=f"Merge failed: {str(e)}")
    db.commit()
    db.refresh(mr)
    return mr


@router.post("/repositories/{repository_id}/merge_requests/{mr_id}/close", response_model=schemas.merge_request.MergeRequest)
def close_merge_request(repository_id: str, mr_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    mr = db.query(MergeRequest).filter(MergeRequest.id == mr_id, MergeRequest.repository_id == repository_id).first()
    if not mr:
        raise HTTPException(status_code=404, detail="Merge Request not found")
    # Allow closing when MR is open or already merged
    if mr.status not in (MergeRequestStatus.OPEN, MergeRequestStatus.MERGED):
        raise HTTPException(status_code=400, detail="Only open or merged MR can be closed")
    mr.status = MergeRequestStatus.CLOSED
    db.commit()
    db.refresh(mr)
    return mr


@router.post("/repositories/{repository_id}/merge_requests/{mr_id}/reopen", response_model=schemas.merge_request.MergeRequest)
def reopen_merge_request(repository_id: str, mr_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    mr = db.query(MergeRequest).filter(MergeRequest.id == mr_id, MergeRequest.repository_id == repository_id).first()
    if not mr:
        raise HTTPException(status_code=404, detail="Merge Request not found")
    if mr.status != MergeRequestStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Only closed MR can be reopened")
    mr.status = MergeRequestStatus.OPEN
    db.commit()
    db.refresh(mr)
    return mr


@router.get("/repositories/{repository_id}/merge_requests/{mr_id}/changes", response_model=schemas.merge_request.MergeRequestChanges)
def get_merge_request_changes(repository_id: str, mr_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    repo_path = get_repo_path(repository_id)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository directory not found")
    repo = git.Repo(repo_path)
    mr = db.query(MergeRequest).filter(MergeRequest.id == mr_id, MergeRequest.repository_id == repository_id).first()
    if not mr:
        raise HTTPException(status_code=404, detail="Merge Request not found")

    # Compute diff between branches
    try:
        source_commit = repo.heads[mr.source_branch].commit
        target_commit = repo.heads[mr.target_branch].commit
    except Exception:
        raise HTTPException(status_code=400, detail="Branch not found")

    # Strategy:
    # - OPEN/CLOSED: show diff target -> source (what would be merged)
    # - MERGED: prefer snapshot SHAs captured at merge time; if missing, pick commits as of mr.updated_at
    try:
        log_mode = ""
        log_base_sha = None
        log_src_sha = None
        log_tgt_sha = None
        log_ts = None

        if mr.status == MergeRequestStatus.MERGED:
            # For MERGED: try to find merge commit by time and use its parents
            # If not found by time, fallback to current heads
            def find_merge_commit_around_time(ts: int):
                if not ts:
                    return None
                try:
                    for c in repo.iter_commits(mr.target_branch, max_count=200):
                        # Look for merge commits around the time MR was updated
                        if len(c.parents) >= 2 and abs(int(c.committed_date) - ts) <= 86400:  # within 1 day
                            return c.parents[0], c.parents[1]  # first parent = target before, second = source at merge
                except Exception:
                    pass
                return None

            ts = int(getattr(mr, 'updated_at', None).timestamp()) if getattr(mr, 'updated_at', None) else None
            merge_parents = find_merge_commit_around_time(ts)
            if merge_parents:
                tgt_at_merge, src_at_merge = merge_parents
                bases = repo.merge_base(tgt_at_merge, src_at_merge)
                base_at = bases[0] if isinstance(bases, (list, tuple)) and bases else bases
                if base_at is None:
                    diffs = tgt_at_merge.diff(src_at_merge, create_patch=True)
                else:
                    diffs = base_at.diff(src_at_merge, create_patch=True)
                log_mode = "merge_parents"
                log_base_sha = getattr(base_at, 'hexsha', None) if base_at else None
                log_src_sha = getattr(src_at_merge, 'hexsha', None)
                log_tgt_sha = getattr(tgt_at_merge, 'hexsha', None)
                log_ts = ts
            else:
                # Fallback: use current branch heads
                diffs = target_commit.diff(source_commit, create_patch=True)
                log_mode = "heads_fallback"
                log_base_sha = None
                log_src_sha = getattr(source_commit, 'hexsha', None)
                log_tgt_sha = getattr(target_commit, 'hexsha', None)
                log_ts = ts
        else:
            diffs = target_commit.diff(source_commit, create_patch=True)
            log_mode = "heads"
            log_base_sha = None
            log_src_sha = getattr(source_commit, 'hexsha', None)
            log_tgt_sha = getattr(target_commit, 'hexsha', None)
    except Exception:
        diffs = target_commit.diff(source_commit, create_patch=True)
        log_mode = "error_fallback_heads"
        log_base_sha = None
        log_src_sha = getattr(source_commit, 'hexsha', None)
        log_tgt_sha = getattr(target_commit, 'hexsha', None)
        log_ts = None

    try:
        # Console log summary of what we compare
        def short(x):
            return (x[:8] if isinstance(x, str) else (x.hexsha[:8] if hasattr(x, 'hexsha') else None)) if x else None
        print(
            f"[MR changes] repo={repository_id} mr={mr_id} status={mr.status} mode={log_mode} "
            f"target={short(log_tgt_sha)} source={short(log_src_sha)} base={short(log_base_sha)} ts={log_ts} "
            f"branches={mr.target_branch}->{mr.source_branch}"
        )
    except Exception:
        pass
    files = []
    for d in diffs:
        raw = d.diff
        diff_text = raw.decode('utf-8', errors='replace') if isinstance(raw, (bytes, bytearray)) else str(raw or "")
        change_type = 'modified'
        if getattr(d, 'new_file', False):
            change_type = 'added'
        elif getattr(d, 'deleted_file', False):
            change_type = 'deleted'
        elif getattr(d, 'renamed', False):
            change_type = 'renamed'
        # Rough counts
        additions = sum(1 for line in diff_text.splitlines() if line.startswith('+') and not line.startswith('+++'))
        deletions = sum(1 for line in diff_text.splitlines() if line.startswith('-') and not line.startswith('---'))
        files.append({
            'path': getattr(d, 'b_path', None) or getattr(d, 'a_path', None),
            'old_path': getattr(d, 'a_path', None),
            'change_type': change_type,
            'additions': additions,
            'deletions': deletions,
            'diff': diff_text
        })
    return schemas.merge_request.MergeRequestChanges(files=files)


@router.get("/repositories/{repository_id}/merge_requests/{mr_id}/comments", response_model=List[schemas.merge_request.MergeRequestComment])
def list_mr_comments(repository_id: str, mr_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    items = db.query(MergeRequestComment).filter(MergeRequestComment.merge_request_id == mr_id).order_by(MergeRequestComment.created_at.asc()).all()
    return items


@router.post("/repositories/{repository_id}/merge_requests/{mr_id}/comments", response_model=schemas.merge_request.MergeRequestComment)
def create_mr_comment(repository_id: str, mr_id: str, payload: schemas.merge_request.MergeRequestCommentCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    _ = check_repository_access(repository_id, str(current_user.id), db)
    mr = db.query(MergeRequest).filter(MergeRequest.id == mr_id, MergeRequest.repository_id == repository_id).first()
    if not mr:
        raise HTTPException(status_code=404, detail="Merge Request not found")
    item = MergeRequestComment(merge_request_id=mr_id, user_id=current_user.id, content=payload.content)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


