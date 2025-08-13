import os
import time
import requests
import docker
import subprocess

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

    post_status(job_id, "running")
    container = None
    exit_code = 1
    try:
        container = docker_client.containers.run(
            image,
            command=["bash", "-lc", script],
            working_dir="/workspace",
            environment=env,
            volumes={os.path.abspath(repo_path): {"bind": "/workspace", "mode": "rw"}} if repo_path else {},
            detach=True,
            stdout=True,
            stderr=True,
        )
        seq = 0
        for line in container.logs(stream=True, follow=True):
            try:
                post_log(job_id, seq, line.decode("utf-8", "ignore"))
            except Exception:
                pass
            seq += 1
        res = container.wait()
        exit_code = res.get("StatusCode", 1)
    except Exception as e:
        post_log(job_id, 0, f"Runner error: {e}\n")
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


