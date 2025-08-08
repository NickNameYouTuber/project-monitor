from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.routing import Route, Mount
from .database import engine
from . import models
from .routes import auth, users, projects, dashboards, dashboard_members, task_columns, tasks, comments, repositories, repository_members, repository_content, git_http, tokens, task_repository_integration, whiteboards
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
