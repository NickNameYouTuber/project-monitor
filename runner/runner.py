import os
import time
import requests
import docker
from docker.errors import APIError
from docker.types import Mount
import traceback
import subprocess
import threading

API = os.environ.get("API_URL", "http://localhost:7671/api").rstrip("/")
TOKEN = os.environ.get("RUNNER_TOKEN", "dev-runner-token")
RUNNER_NAME = os.environ.get("RUNNER_NAME", "default-runner")
WORKSPACE_ROOT = os.environ.get("WORKSPACE_ROOT", "/git-repos")

session = requests.Session()
session.headers["Authorization"] = f"Bearer {TOKEN}"
session.headers["X-Runner-Name"] = RUNNER_NAME
docker_client = docker.from_env()


def lease():
    try:
        r = session.post(f"{API}/pipelines/runners/lease", json={"tags": []}, timeout=15)
        if r.status_code == 204 or not r.text:
            return None
        if r.status_code == 200:
            data = r.json()
            if not data:
                return None
            return data
    except Exception:
        return None
    return None


def post_log(job_id: str, seq: int, content: str):
    try:
        session.post(f"{API}/pipelines/jobs/{job_id}/logs", json={"seq": seq, "content": content}, timeout=10)
    except Exception:
        pass


def post_status(job_id: str, status: str, exit_code: int | None = None):
    body = {"status": status}
    if exit_code is not None:
        body["exit_code"] = exit_code
    try:
        session.post(f"{API}/pipelines/jobs/{job_id}/status", json=body, timeout=10)
    except Exception:
        pass


def run_job(job: dict):
    job_id = job["job_id"]
    repo_path = job.get("repo_path") or ""
    image = job["image"]
    script_lines = job.get("script") or []
    script = " && ".join([line for line in script_lines if line and line.strip()]) or "echo nothing"
    env = job.get("env") or {}

    # Ensure repo checkout best-effort (commit optional)
    if repo_path and os.path.isdir(repo_path):
        try:
            subprocess.run(["git", "-C", repo_path, "fetch", "--all", "-p"], check=False)
            commit = (job.get("commit_sha") or "").strip()
            if commit:
                subprocess.run(["git", "-C", repo_path, "checkout", "-f", commit], check=False)
        except Exception:
            pass

    # Double check not canceled before start
    try:
        r = session.get(f"{API}/pipelines/jobs/{job_id}", timeout=10)
        if r.ok and r.json().get("status") == "canceled":
            post_status(job_id, "canceled")
            return
    except Exception:
        pass

    post_status(job_id, "running")
    container = None
    exit_code = 1
    try:
        # Mount named volume (not host path) so nested container sees same git volume
        mounts = []
        git_volume_name = os.environ.get("GIT_REPOS_VOLUME", "gitrepos")
        mounts.append(Mount(target="/git-repos", source=git_volume_name, type="volume", read_only=False))

        working_dir = "/workspace"
        if repo_path and repo_path.startswith("/git-repos"):
            working_dir = repo_path

        container = docker_client.containers.run(
            image,
            command=["bash", "-lc", script],
            working_dir=working_dir,
            environment=env,
            mounts=mounts,
            detach=True,
            stdout=True,
            stderr=True,
        )
        seq = 0
        cancel_check_counter = 0
        for line in container.logs(stream=True, follow=True):
            try:
                post_log(job_id, seq, line.decode("utf-8", "ignore"))
            except Exception:
                pass
            seq += 1
            cancel_check_counter += 1
            if cancel_check_counter % 50 == 0:
                try:
                    r = session.get(f"{API}/pipelines/jobs/{job_id}", timeout=5)
                    if r.ok and r.json().get("status") == "canceled":
                        try:
                            container.kill()
                        except Exception:
                            pass
                        exit_code = 137
                        break
                except Exception:
                    pass
        res = container.wait()
        exit_code = res.get("StatusCode", 1)
    except APIError as e:
        detail = getattr(e, 'explanation', None) or str(e)
        post_log(job_id, 0, f"Runner error (Docker API): {detail}\n{traceback.format_exc()}\n")
    except Exception as e:
        post_log(job_id, 0, f"Runner error: {e}\n{traceback.format_exc()}\n")
    finally:
        try:
            if container is not None:
                container.remove()
        except Exception:
            pass
        post_status(job_id, "success" if exit_code == 0 else "failed", exit_code=exit_code)


def main():
    while True:
        job = lease()
        if not job:
            time.sleep(5)
            continue
        run_job(job)


if __name__ == "__main__":
    main()


