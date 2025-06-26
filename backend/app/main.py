from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from . import models
from .routes import auth, users, projects, dashboards, dashboard_members, task_columns, tasks, comments, repositories, repository_members, repository_content
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

# Роутеры для задач, колонок и комментариев
app.include_router(task_columns.router, prefix=api_prefix)
app.include_router(tasks.router, prefix=api_prefix)
app.include_router(comments.router, prefix=api_prefix)


@app.get("/")
def read_root():
    return {"message": "Welcome to the Project Monitor API"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=7671, reload=True)
