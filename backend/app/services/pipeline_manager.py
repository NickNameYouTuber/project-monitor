from __future__ import annotations
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime
from sqlalchemy.orm import Session

from ..models.pipeline import Pipeline, PipelineJob, PipelineStatus, JobStatus, PipelineSource
from ..models.repository import Repository
from ..models.user import User
from .pipeline_parser import parse_pipeline_yaml
import git


REPOS_BASE_DIR = os.environ.get("GIT_REPOS_DIR", "/app/git_repos")


def _repo_path(repository_id: str) -> str:
    return os.path.join(REPOS_BASE_DIR, str(repository_id))


def _read_pipeline_file(repo_path: str, *, ref: Optional[str], commit_sha: Optional[str]) -> Optional[str]:
    try:
        repo = git.Repo(repo_path)
    except Exception:
        return None

    candidates = [
        ".pm-ci.yml", ".pm-ci.yaml",
        ".ci.yml", ".ci.yaml",
        ".nit-ci.yml", ".nit-ci.yaml",
    ]

    # Try commit
    if commit_sha:
        for name in candidates:
            for rev in [commit_sha, f"{commit_sha}"]:
                try:
                    return repo.git.show(f"{rev}:{name}")
                except Exception:
                    pass

    # Build list of ref candidates
    ref_candidates: List[str] = []
    if ref:
        ref_candidates.extend([ref, f"refs/heads/{ref}"])
    # active branch
    try:
        ab = repo.active_branch.name
        ref_candidates.extend([ab, f"refs/heads/{ab}"])
    except Exception:
        pass
    # conventional names
    for nm in ["main", "master"]:
        ref_candidates.extend([nm, f"refs/heads/{nm}"])
    # all heads
    try:
        for h in repo.heads:
            ref_candidates.extend([h.name, f"refs/heads/{h.name}"])
    except Exception:
        pass

    # Deduplicate while preserving order
    seen = set()
    ordered_refs: List[str] = []
    for r in ref_candidates:
        if r and r not in seen:
            seen.add(r)
            ordered_refs.append(r)

    for name in candidates:
        for r in ordered_refs:
            try:
                return repo.git.show(f"{r}:{name}")
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

    # Validate triggering user exists; if not, set None
    if user_id:
        exists = db.query(User).filter(User.id == user_id).first()
        if not exists:
            user_id = None

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

        # Normalize script lines to strings
        raw_script = job_cfg.get("script") or ["echo nothing"]
        if isinstance(raw_script, str):
            script_lines = [raw_script]
        else:
            script_lines = []
            for item in raw_script:
                # Common YAML forms
                if isinstance(item, dict):
                    if "run" in item:
                        script_lines.append(str(item.get("run")))
                        continue
                    if len(item) == 1:
                        k, v = next(iter(item.items()))
                        if v is None:
                            script_lines.append(str(k))
                        elif isinstance(v, (list, tuple)):
                            script_lines.append(str(k) + " " + " ".join(str(x) for x in v))
                        else:
                            script_lines.append(str(k) + " " + str(v))
                        continue
                    # Fallback: join key=value
                    script_lines.append(" ".join(f"{str(k)}={str(v)}" for k, v in item.items()))
                    continue
                if isinstance(item, (list, tuple)):
                    script_lines.append(" ".join(str(x) for x in item))
                    continue
                script_lines.append(str(item))

        max_retries = 0
        timeout_seconds = None
        retry_cfg = job_cfg.get("retry")
        if isinstance(retry_cfg, int):
            max_retries = retry_cfg
        elif isinstance(retry_cfg, dict):
            try:
                max_retries = int(retry_cfg.get("max", 0))
            except Exception:
                max_retries = 0
        tmo = job_cfg.get("timeout")
        if tmo is not None:
            try:
                timeout_seconds = int(tmo)
            except Exception:
                timeout_seconds = None

        pj = PipelineJob(
            pipeline_id=pipeline.id,
            name=job_cfg["name"],
            stage=job_cfg.get("stage"),
            image=job_cfg.get("image") or "alpine:3",
            script="\n".join(script_lines),
            env_json=json.dumps(job_cfg.get("env") or {}),
            needs_json=json.dumps(job_cfg.get("needs") or []),
            status=JobStatus.QUEUED,
            max_retries=max_retries,
            timeout_seconds=timeout_seconds,
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


