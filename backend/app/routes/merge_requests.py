from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_active_user
from ..models import Repository, RepositoryMember, User
from ..models.merge_request import MergeRequest, MergeRequestStatus, MergeRequestApproval, MergeRequestComment
from .. import schemas
from ..routes.repository_content import get_repo_path, check_repository_access
import git
import os

router = APIRouter()


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
                user_name=(lambda u: u.username if u is not None else None)(db.query(User).filter(User.id == a.user_id).first()) if a.user_id else None,
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
        # Checkout target
        repo.git.checkout(mr.target_branch)
        # Merge source into target
        repo.git.merge(mr.source_branch, '--no-ff')
    except git.GitCommandError as e:
        raise HTTPException(status_code=400, detail=f"Merge failed: {str(e)}")

    mr.status = MergeRequestStatus.MERGED
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

    diffs = target_commit.diff(source_commit, create_patch=True)
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
        files.append({
            'path': getattr(d, 'b_path', None) or getattr(d, 'a_path', None),
            'old_path': getattr(d, 'a_path', None),
            'change_type': change_type,
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


