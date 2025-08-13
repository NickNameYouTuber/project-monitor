from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import os
import json

from ..database import get_db
from ..auth import get_current_active_user
from ..models import Repository, RepositoryMember, User
from ..models.pipeline import Pipeline, PipelineJob, PipelineStatus, JobStatus, PipelineArtifact, PipelineLogChunk, Runner, PipelineSource
from ..schemas.pipeline import Pipeline as PipelineSchema, PipelineListItem, TriggerPipelineRequest, LeaseRequest, LeaseResponse, JobStatusUpdate, JobLogChunk, PipelineJob as PipelineJobSchema
from ..services.pipeline_manager import trigger_pipeline, pick_next_job
from .repository_content import get_repo_path


router = APIRouter()


@router.post("/repositories/{repository_id}/pipelines/trigger", response_model=PipelineSchema)
def trigger(repository_id: str, payload: TriggerPipelineRequest, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    try:
        p = trigger_pipeline(
            db,
            repository_id=repository_id,
            ref=payload.ref,
            commit_sha=payload.commit_sha,
            source=payload.source,
            user_id=str(current_user.id),
        )
        if not p:
            raise HTTPException(status_code=400, detail="No pipeline file found or failed to create pipeline")
        return p
    except HTTPException:
        raise
    except Exception as e:
        # Return diagnostic to help debug
        raise HTTPException(status_code=500, detail=f"Trigger failed: {e}")


@router.get("/repositories/{repository_id}/pipelines", response_model=List[PipelineListItem])
def list_pipelines(repository_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    items = db.query(Pipeline).filter(Pipeline.repository_id == repository_id).order_by(Pipeline.created_at.desc()).all()
    return items


@router.get("/pipelines/{pipeline_id}", response_model=PipelineSchema)
def get_pipeline(pipeline_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    p = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return p


@router.post("/pipelines/{pipeline_id}/cancel")
def cancel_pipeline(pipeline_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    p = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    # Mark pipeline canceled
    p.status = PipelineStatus.CANCELED
    p.finished_at = datetime.utcnow()
    # Cancel all non-finished jobs
    jobs = db.query(PipelineJob).filter(PipelineJob.pipeline_id == p.id).all()
    for j in jobs:
        if j.status not in (JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELED):
            j.status = JobStatus.CANCELED
            j.finished_at = datetime.utcnow()
    db.commit()
    return {"status": "ok"}


def _get_runner_from_token(db: Session, authorization: Optional[str], runner_name: Optional[str]) -> Runner:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Runner token required")
    token = authorization.split(" ", 1)[1].strip()
    runner = db.query(Runner).filter(Runner.token == token).first()
    if not runner:
        # auto-register
        runner = Runner(name=runner_name or "auto-runner", token=token, active=True, last_seen_at=datetime.utcnow())
        db.add(runner)
        db.commit()
        db.refresh(runner)
    else:
        runner.last_seen_at = datetime.utcnow()
        db.commit()
    return runner


@router.post("/pipelines/runners/lease", response_model=Optional[LeaseResponse])
def lease_job(body: LeaseRequest, db: Session = Depends(get_db), authorization: Optional[str] = Header(default=None), x_runner_name: Optional[str] = Header(default=None)):
    _ = _get_runner_from_token(db, authorization, x_runner_name)
    job = pick_next_job(db)
    if not job:
        return None
    # Mark running
    job.status = JobStatus.RUNNING
    job.started_at = datetime.utcnow()
    # Set pipeline running if not already
    pipeline = db.query(Pipeline).filter(Pipeline.id == job.pipeline_id).first()
    if pipeline and pipeline.status == PipelineStatus.QUEUED:
        pipeline.status = PipelineStatus.RUNNING
        pipeline.started_at = datetime.utcnow()
    db.commit()
    db.refresh(job)

    # Build lease response
    env = {}
    artifacts_paths: List[str] = []
    try:
        env = json.loads(job.env_json or "{}")
        artifacts_paths = json.loads(job.needs_json or "[]")  # reuse field not to add column for minimal impl
    except Exception:
        pass
    repo_path = str(get_repo_path(str(pipeline.repository_id))) if pipeline else ""

    return LeaseResponse(
        job_id=str(job.id),
        repository_id=str(pipeline.repository_id) if pipeline else "",
        repo_path=repo_path,
        commit_sha=pipeline.commit_sha if pipeline else None,
        image=job.image,
        script=(job.script or "").split("\n") if job.script else [],
        env=env,
        artifacts_paths=[],
    )


@router.post("/pipelines/jobs/{job_id}/logs")
def push_logs(job_id: str, body: JobLogChunk, db: Session = Depends(get_db), authorization: Optional[str] = Header(default=None)):
    _ = _get_runner_from_token(db, authorization, None)
    job = db.query(PipelineJob).filter(PipelineJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    chunk = PipelineLogChunk(job_id=job.id, seq=body.seq, content=body.content)
    db.add(chunk)
    db.commit()
    return {"status": "ok"}


@router.post("/pipelines/jobs/{job_id}/status")
def update_status(job_id: str, body: JobStatusUpdate, db: Session = Depends(get_db), authorization: Optional[str] = Header(default=None)):
    _ = _get_runner_from_token(db, authorization, None)
    job = db.query(PipelineJob).filter(PipelineJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = body.status
    job.exit_code = body.exit_code
    job.finished_at = datetime.utcnow() if body.status in (JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELED) else None
    db.commit()

    # Update pipeline if all jobs finished
    pipeline = db.query(Pipeline).filter(Pipeline.id == job.pipeline_id).first()
    if pipeline:
        jobs = db.query(PipelineJob).filter(PipelineJob.pipeline_id == pipeline.id).all()
        if all(j.status in (JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELED) for j in jobs):
            pipeline.finished_at = datetime.utcnow()
            # pipeline SUCCESS if all jobs SUCCESS
            pipeline.status = PipelineStatus.SUCCESS if all(j.status == JobStatus.SUCCESS for j in jobs) else PipelineStatus.FAILED
            db.commit()
    return {"status": "ok"}


@router.get("/pipelines/jobs/{job_id}", response_model=PipelineJobSchema)
def get_job(job_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(default=None), current_user: Optional[User] = Depends(get_current_active_user)):
    # Allow either runner token or user auth
    runner_ok = False
    try:
        if authorization:
            _ = _get_runner_from_token(db, authorization, None)
            runner_ok = True
    except Exception:
        runner_ok = False
    if not runner_ok and not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    job = db.query(PipelineJob).filter(PipelineJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/pipelines/jobs/{job_id}/logs")
def get_job_logs(job_id: str, db: Session = Depends(get_db), authorization: Optional[str] = Header(default=None), current_user: Optional[User] = Depends(get_current_active_user)):
    # Allow either runner token or user auth
    runner_ok = False
    try:
        if authorization:
            _ = _get_runner_from_token(db, authorization, None)
            runner_ok = True
    except Exception:
        runner_ok = False
    if not runner_ok and not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    job = db.query(PipelineJob).filter(PipelineJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    chunks = db.query(PipelineLogChunk).filter(PipelineLogChunk.job_id == job_id).order_by(PipelineLogChunk.seq.asc()).all()
    text = "".join([c.content or "" for c in chunks])
    return {"logs": text}


@router.post("/pipelines/jobs/{job_id}/artifacts")
def upload_artifact(job_id: str, file: UploadFile = File(...), db: Session = Depends(get_db), authorization: Optional[str] = Header(default=None)):
    _ = _get_runner_from_token(db, authorization, None)
    job = db.query(PipelineJob).filter(PipelineJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    pipeline = db.query(Pipeline).filter(Pipeline.id == job.pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    base = os.environ.get("PIPELINE_ARTIFACTS_DIR", "/app/pipeline_artifacts")
    os.makedirs(base, exist_ok=True)
    repo_dir = os.path.join(base, str(pipeline.repository_id), str(pipeline.id), job.name)
    os.makedirs(repo_dir, exist_ok=True)
    target_path = os.path.join(repo_dir, file.filename)
    with open(target_path, "wb") as f:
        content = file.file.read()
        f.write(content)
    size = os.path.getsize(target_path)
    art = PipelineArtifact(job_id=job.id, path=file.filename, size=size, content_path=target_path)
    db.add(art)
    db.commit()
    return {"status": "ok", "size": size}


