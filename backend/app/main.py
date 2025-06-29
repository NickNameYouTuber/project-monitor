from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.routing import Route, Mount
from .database import engine
from . import models
from .routes import auth, users, projects, dashboards, dashboard_members, task_columns, tasks, comments, repositories, repository_members, repository_content, git_http, tokens, task_repository_integration
import subprocess
import os
from pathlib import Path
import uvicorn

# Create database tables
models.user.Base.metadata.create_all(bind=engine)
models.project.Base.metadata.create_all(bind=engine)
models.dashboard.Base.metadata.create_all(bind=engine)
models.dashboard_member.Base.metadata.create_all(bind=engine)
models.task_column.Base.metadata.create_all(bind=engine)
models.task.Base.metadata.create_all(bind=engine)
models.comment.Base.metadata.create_all(bind=engine)
models.repository.Base.metadata.create_all(bind=engine)
models.repository_member.Base.metadata.create_all(bind=engine)
models.token.Base.metadata.create_all(bind=engine)  # Initialize personal access token table

app = FastAPI(
    title="Project Monitor API",
    description="API for Project Monitor application",
    version="1.0.0",
)

# CORS configuration
origins = [
    "http://localhost:5173",     # Frontend dev server
    "http://localhost:7670",     # Frontend in Docker
    "http://localhost:3000",     # Another possible frontend port
    "https://projectsmonitor.nicorp.tech", # Production domain
    "http://projectsmonitor.nicorp.tech",  # Production domain HTTP
    # "*",                       # Allow any origin in development (commented out for production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Use specified origins list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Catch-all routes for Git HTTP protocol to handle URLs with .git and subpaths
@app.get("/api/git/{repository_id:path}")
async def git_catch_all_get(request: Request):
    return await git_http.handle_git_http_request(request, "GET")

@app.post("/api/git/{repository_id:path}")
async def git_catch_all_post(request: Request):
    return await git_http.handle_git_http_request(request, "POST")

# Роутеры для задач, колонок и комментариев
app.include_router(task_columns.router, prefix=api_prefix)
app.include_router(tasks.router, prefix=api_prefix)
app.include_router(comments.router, prefix=api_prefix)

# Роутер для интеграции задач с репозиториями
app.include_router(task_repository_integration.router, prefix=api_prefix)


@app.get("/")
def read_root():
    return {"message": "Welcome to the Project Monitor API"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=7671, reload=True)
