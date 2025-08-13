from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.routing import Route, Mount
from .database import engine, SQLALCHEMY_DATABASE_URL
from sqlalchemy import text
from . import models
from .routes import auth, users, projects, dashboards, dashboard_members, task_columns, tasks, comments, repositories, repository_members, repository_content, git_http, tokens, task_repository_integration, whiteboards, merge_requests, pipelines
from .utils.telegram_notify import notify_task_event_silent
import subprocess
import os
from pathlib import Path
import uvicorn
import sqlite3

# Create database tables (works for both SQLite and Postgres)
for base in [
    models.user.Base,
    models.project.Base,
    models.dashboard.Base,
    models.dashboard_member.Base,
    models.task_column.Base,
    models.task.Base,
    models.comment.Base,
    models.repository.Base,
    models.repository_member.Base,
    models.token.Base,
    models.merge_request.Base,
    models.whiteboard.Base,
    models.pipeline.Base,
]:
    base.metadata.create_all(bind=engine)


def _apply_startup_migrations():
    try:
        db_path = SQLALCHEMY_DATABASE_URL.replace('sqlite:///', '')
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        # Add is_system to comments if missing
        try:
            cur.execute("ALTER TABLE comments ADD COLUMN is_system BOOLEAN DEFAULT FALSE;")
        except Exception:
            pass
        # Add reviewer_id to tasks if missing
        try:
            cur.execute("ALTER TABLE tasks ADD COLUMN reviewer_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL;")
        except Exception:
            pass
        # Add planning fields to tasks
        try:
            cur.execute("ALTER TABLE tasks ADD COLUMN due_date DATETIME")
        except Exception:
            pass
        try:
            cur.execute("ALTER TABLE tasks ADD COLUMN estimate_minutes INTEGER")
        except Exception:
            pass
        # Whiteboards table incremental columns
        try:
            cur.execute("ALTER TABLE whiteboards ADD COLUMN updated_at DATETIME")
        except Exception:
            pass

        # Whiteboard elements table incremental columns
        for stmt in [
            "ALTER TABLE whiteboard_elements ADD COLUMN whiteboard_id TEXT",
            "ALTER TABLE whiteboard_elements ADD COLUMN type TEXT",
            "ALTER TABLE whiteboard_elements ADD COLUMN x INTEGER",
            "ALTER TABLE whiteboard_elements ADD COLUMN y INTEGER",
            "ALTER TABLE whiteboard_elements ADD COLUMN width INTEGER",
            "ALTER TABLE whiteboard_elements ADD COLUMN height INTEGER",
            "ALTER TABLE whiteboard_elements ADD COLUMN rotation INTEGER",
            "ALTER TABLE whiteboard_elements ADD COLUMN z_index INTEGER",
            "ALTER TABLE whiteboard_elements ADD COLUMN text TEXT",
            "ALTER TABLE whiteboard_elements ADD COLUMN fill TEXT",
            "ALTER TABLE whiteboard_elements ADD COLUMN text_color TEXT",
            "ALTER TABLE whiteboard_elements ADD COLUMN font_family TEXT",
            "ALTER TABLE whiteboard_elements ADD COLUMN font_size INTEGER",
            "ALTER TABLE whiteboard_elements ADD COLUMN created_at DATETIME",
            "ALTER TABLE whiteboard_elements ADD COLUMN updated_at DATETIME",
        ]:
            try:
                cur.execute(stmt)
            except Exception:
                pass

        # Whiteboard connections table incremental columns
        for stmt in [
            "ALTER TABLE whiteboard_connections ADD COLUMN whiteboard_id TEXT",
            "ALTER TABLE whiteboard_connections ADD COLUMN from_element_id TEXT",
            "ALTER TABLE whiteboard_connections ADD COLUMN to_element_id TEXT",
            "ALTER TABLE whiteboard_connections ADD COLUMN stroke TEXT",
            "ALTER TABLE whiteboard_connections ADD COLUMN stroke_width INTEGER",
            "ALTER TABLE whiteboard_connections ADD COLUMN points TEXT",
            "ALTER TABLE whiteboard_connections ADD COLUMN created_at DATETIME",
            "ALTER TABLE whiteboard_connections ADD COLUMN updated_at DATETIME",
        ]:
            try:
                cur.execute(stmt)
            except Exception:
                pass

        # Merge requests: add snapshot columns if missing
        for stmt in [
            "ALTER TABLE merge_requests ADD COLUMN base_sha_at_merge TEXT",
            "ALTER TABLE merge_requests ADD COLUMN source_sha_at_merge TEXT",
            "ALTER TABLE merge_requests ADD COLUMN target_sha_at_merge TEXT",
            "ALTER TABLE merge_requests ADD COLUMN merge_commit_sha TEXT",
            "ALTER TABLE merge_requests ADD COLUMN merged_at DATETIME",
        ]:
            try:
                cur.execute(stmt)
            except Exception:
                pass
        conn.commit()
        conn.close()
    except Exception:
        # Best-effort; do not crash app on migration issues
        pass

# Keep SQLite-only startup migrations guarded
if SQLALCHEMY_DATABASE_URL.startswith('sqlite'):
    _apply_startup_migrations()
elif SQLALCHEMY_DATABASE_URL.startswith('postgres'):
    # Minimal Postgres migrations
    try:
        with engine.connect() as conn:
            # Ensure whiteboard elements extra columns exist
            for stmt in [
                "ALTER TABLE whiteboard_elements ADD COLUMN IF NOT EXISTS text_color TEXT",
                "ALTER TABLE whiteboard_elements ADD COLUMN IF NOT EXISTS font_family TEXT",
                "ALTER TABLE whiteboard_elements ADD COLUMN IF NOT EXISTS font_size INTEGER",
                # Tasks planning fields
                "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP",
                "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimate_minutes INTEGER",
                # MR reviewer
                "ALTER TABLE merge_requests ADD COLUMN IF NOT EXISTS reviewer_id UUID",
                # CI/CD tables (idempotent if exist)
                "CREATE TABLE IF NOT EXISTS pipelines (id UUID PRIMARY KEY, repository_id UUID NOT NULL, commit_sha TEXT, ref TEXT, source TEXT NOT NULL, status TEXT NOT NULL, triggered_by_user_id TEXT, created_at TIMESTAMP, started_at TIMESTAMP, finished_at TIMESTAMP)",
                "CREATE TABLE IF NOT EXISTS pipeline_jobs (id UUID PRIMARY KEY, pipeline_id UUID NOT NULL, name TEXT NOT NULL, stage TEXT, image TEXT NOT NULL, script TEXT NOT NULL, env_json TEXT, needs_json TEXT, status TEXT NOT NULL, started_at TIMESTAMP, finished_at TIMESTAMP, exit_code INTEGER, retries INTEGER DEFAULT 0, max_retries INTEGER DEFAULT 0)",
                "CREATE TABLE IF NOT EXISTS pipeline_log_chunks (id UUID PRIMARY KEY, job_id UUID NOT NULL, seq INTEGER NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP)",
                "CREATE TABLE IF NOT EXISTS pipeline_artifacts (id UUID PRIMARY KEY, job_id UUID NOT NULL, path TEXT NOT NULL, size INTEGER, content_path TEXT NOT NULL, created_at TIMESTAMP)",
                "CREATE TABLE IF NOT EXISTS runners (id UUID PRIMARY KEY, name TEXT NOT NULL, token TEXT UNIQUE NOT NULL, active BOOLEAN DEFAULT TRUE, tags_json TEXT, last_seen_at TIMESTAMP)",
            ]:
                try:
                    conn.execute(text(stmt))
                except Exception:
                    # Best-effort: ignore if not applicable
                    pass
            conn.commit()
    except Exception:
        pass

app = FastAPI(
    title="NIT API",
    description="API for NIT application",
    version="1.0.0",
)

"""
Main FastAPI application instance with metadata configuration.
Serves as the central entry point for the Project Monitor API.
"""

# CORS configuration
origins = [
    "http://localhost:5173",     # Frontend dev server
    "http://localhost:7670",     # Frontend in Docker
    "http://localhost:3000",     # Another possible frontend port
    "https://nit.nicorp.tech", # Production domain
    "http://nit.nicorp.tech",  # Production domain HTTP
    # "*",                       # Allow any origin in development (commented out for production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Use specified origins list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
Configures Cross-Origin Resource Sharing (CORS) middleware to allow:
- Specified frontend origins
- Credential sharing
- All HTTP methods and headers
"""

# Регистрация всех роутеров с единым префиксом /api на уровне приложения
api_prefix = "/api"

# Регистрируем все роутеры
app.include_router(auth.router, prefix=f"{api_prefix}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{api_prefix}/users", tags=["users"])
app.include_router(projects.router, prefix=f"{api_prefix}/projects", tags=["projects"])
app.include_router(dashboards.router, prefix=f"{api_prefix}/dashboards", tags=["dashboards"])
app.include_router(dashboard_members.router, prefix=f"{api_prefix}/dashboards", tags=["dashboard_members"])
app.include_router(repositories.router, prefix=f"{api_prefix}/repositories", tags=["repositories"])
app.include_router(repository_members.router, prefix=f"{api_prefix}/repositories", tags=["repository_members"])
app.include_router(repository_content.router, prefix=f"{api_prefix}/repositories", tags=["repository_content"])
app.include_router(tokens.router, prefix=f"{api_prefix}/tokens", tags=["tokens"])
app.include_router(whiteboards.router, prefix=f"{api_prefix}", tags=["whiteboards"])
app.include_router(merge_requests.router, prefix=f"{api_prefix}", tags=["merge_requests"])
app.include_router(pipelines.router, prefix=f"{api_prefix}", tags=["pipelines"])

# Catch-all routes for Git HTTP protocol to handle URLs with .git and subpaths
@app.get("/api/git/{repository_id:path}")
async def git_catch_all_get(request: Request):
    """
    Handles Git HTTP GET requests for repository operations.
    
    Delegates request processing to the git_http module's handler.
    
    Args:
        request (Request): Incoming HTTP request object
        
    Returns:
        Response: Result from git_http handler
    """
    return await git_http.handle_git_http_request(request, "GET")

@app.post("/api/git/{repository_id:path}")
async def git_catch_all_post(request: Request):
    """
    Handles Git HTTP POST requests for repository operations.
    
    Delegates request processing to the git_http module's handler.
    
    Args:
        request (Request): Incoming HTTP request object
        
    Returns:
        Response: Result from git_http handler
    """
    return await git_http.handle_git_http_request(request, "POST")

# Роутеры для задач, колонок и комментариев
app.include_router(task_columns.router, prefix=api_prefix)
app.include_router(tasks.router, prefix=api_prefix)
app.include_router(comments.router, prefix=api_prefix)

# Роутер для интеграции задач с репозиториями
app.include_router(task_repository_integration.router, prefix=api_prefix)


@app.get("/")
def read_root():
    """
    Root endpoint for the API.
    
    Returns a welcome message to confirm API availability.
    
    Returns:
        dict: Welcome message with status information
    """
    return {"message": "Welcome to the Project Monitor API"}


if __name__ == "__main__":
    """
    Development server entry point.
    
    Starts the Uvicorn ASGI server with auto-reload enabled for development purposes.
    """
    uvicorn.run("app.main:app", host="0.0.0.0", port=7671, reload=True)
