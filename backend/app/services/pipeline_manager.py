from __future__ import annotations
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime
from sqlalchemy.orm import Session

from ..models.pipeline import Pipeline, PipelineJob, PipelineStatus, JobStatus, PipelineSource
from ..models.repository import Repository
from .pipeline_parser import parse_pipeline_yaml
import git


REPOS_BASE_DIR = os.environ.get("GIT_REPOS_DIR", "/app/git_repos")


def _repo_path(repository_id: str) -> str:
    return os.path.join(REPOS_BASE_DIR, str(repository_id))


def _read_pipeline_file(repo_path: str, *, ref: Optional[str], commit_sha: Optional[str]) -> Optional[str]:
    try:
        repo = git.Repo(repo_path)
    except Exception:
        # Not a git repo yet
        return None

    candidates = [".pm-ci.yml", ".pm-ci.yaml"]

    # If commit_sha provided, try to read directly from that commit
    if commit_sha:
        for name in candidates:
            try:
                return repo.git.show(f"{commit_sha}:{name}")
            except Exception:
                continue

    # Determine branch/ref
    branch_name: Optional[str] = ref
    try:
        heads = [h.name for h in repo.heads]
    except Exception:
        heads = []
    if not branch_name:
        try:
            branch_name = repo.active_branch.name
        except Exception:
            branch_name = None
    if not branch_name:
        for candidate in ["main", "master"]:
            if candidate in heads:
                branch_name = candidate
                break
    if not branch_name and heads:
        branch_name = heads[0]

    if not branch_name:
        return None

    for name in candidates:
        try:
            return repo.git.show(f"{branch_name}:{name}")
        except Exception:
            continue

    return None


def trigger_pipeline(
    db: Session,
    *,
    repository_id: str,
    ref: Optional[str] = None,
    commit_sha: Optional[str] = None,
    source: PipelineSource = PipelineSource.PUSH,
    user_id: Optional[str] = None,
) -> Optional[Pipeline]:
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        return None
    repo_path = _repo_path(repository_id)
    content = _read_pipeline_file(repo_path, ref=ref, commit_sha=commit_sha)
    if not content:
        # No pipeline file — do nothing
        return None

    parsed = parse_pipeline_yaml(content)

    pipeline = Pipeline(
        repository_id=repository_id,
        commit_sha=commit_sha,
        ref=ref,
        source=source,
        status=PipelineStatus.QUEUED,
        triggered_by_user_id=user_id,
        created_at=datetime.utcnow(),
    )
    db.add(pipeline)
    db.flush()  # get id

    # Build job graph
    for job_cfg in parsed.jobs:
        # simple filters by source; minimal implementation
        only = set(job_cfg.get("only") or [])
        except_ = set(job_cfg.get("except") or [])
        src = "mr" if source == PipelineSource.MR else "push"
        if only and src not in only:
            continue
        if except_ and src in except_:
            continue

        pj = PipelineJob(
            pipeline_id=pipeline.id,
            name=job_cfg["name"],
            stage=job_cfg.get("stage"),
            image=job_cfg.get("image") or "alpine:3",
            script="\n".join(job_cfg.get("script") or ["echo nothing"]),
            env_json=json.dumps(job_cfg.get("env") or {}),
            needs_json=json.dumps(job_cfg.get("needs") or []),
            status=JobStatus.QUEUED,
        )
        db.add(pj)

    db.commit()
    db.refresh(pipeline)
    return pipeline


def pick_next_job(db: Session) -> Optional[PipelineJob]:
    # Find a queued job whose needs are satisfied
    jobs: List[PipelineJob] = db.query(PipelineJob).filter(PipelineJob.status == JobStatus.QUEUED).all()
    for job in jobs:
        needs: List[str] = []
        try:
            needs = json.loads(job.needs_json or "[]")
        except Exception:
            needs = []
        if not needs:
            return job
        # Check needed jobs are successful
        success = True
        for need_name in needs:
            dep = (
                db.query(PipelineJob)
                .filter(PipelineJob.pipeline_id == job.pipeline_id, PipelineJob.name == need_name)
                .first()
            )
            if not dep or dep.status != JobStatus.SUCCESS:
                success = False
                break
        if success:
            return job
    return None


