from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from . import models
from .routes import auth, users, projects, dashboards, dashboard_members, task_columns, tasks, comments
import uvicorn

# Create database tables
models.user.Base.metadata.create_all(bind=engine)
models.project.Base.metadata.create_all(bind=engine)
models.dashboard.Base.metadata.create_all(bind=engine)
models.dashboard_member.Base.metadata.create_all(bind=engine)
models.task_column.Base.metadata.create_all(bind=engine)
models.task.Base.metadata.create_all(bind=engine)
models.comment.Base.metadata.create_all(bind=engine)

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

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(dashboards.router, prefix="/api/dashboards", tags=["dashboards"])
app.include_router(dashboard_members.router, prefix="/api/dashboards", tags=["dashboard_members"])
app.include_router(task_columns.router)
app.include_router(tasks.router)

# Регистрируем роутер комментариев и создаем дополнительный для пути /api/tasks/{task_id}/comments
app.include_router(comments.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the Project Monitor API"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=7671, reload=True)
