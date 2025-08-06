from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import sys

# Get the app's root directory
app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
"""
Determines the application's root directory by navigating two levels up from this file.
Used as fallback for local development database path.
"""

# Path for database storage
# In Docker, use /data directory which is mounted as a volume
# In development, use a local file in the backend directory
if os.path.exists("/data"):
    # Docker environment
    db_dir = "/data"
    os.makedirs(db_dir, exist_ok=True)
    db_path = os.path.join(db_dir, "app.db")
else:
    # Local development environment
    db_dir = app_root
    db_path = os.path.join(db_dir, "app.db")
    
print(f"Using database at: {db_path}")
"""
Configures database storage path based on environment:
- Uses Docker-mounted /data volume in production
- Uses local file in project root during development
"""

SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
"""
Database connection URL constructed from environment-specific path.
Uses SQLite with file-based storage for simplicity in development and Docker.
"""

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
"""
SQLAlchemy engine configured with:
- Database URL from environment-specific path
- check_same_thread=False to allow multiple connections in FastAPI
"""

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
"""
SessionFactory for creating database sessions with:
- autocommit=False: manual transaction control
- autoflush=False: explicit flush control
- bound to the configured engine
"""

Base = declarative_base()
"""
Base class for all database models.
Provides interface for mapping classes to database tables.
"""

# Dependency for routes
def get_db():
    """
    Creates and manages database sessions for route dependencies.
    
    Yields a new SessionLocal instance for the current request,
    ensuring proper cleanup through context management.
    
    Returns:
        Session: SQLAlchemy database session
        
    Usage:
        Depends(get_db) in route parameters to inject database sessions
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
