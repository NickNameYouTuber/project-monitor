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

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///:memory:")

if DATABASE_URL.startswith("postgres"):
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
else:
    # Fallback to SQLite (dev only)
    if os.path.exists("/data"):
        db_dir = "/data"
        os.makedirs(db_dir, exist_ok=True)
        db_path = os.path.join(db_dir, "app.db")
    else:
        db_dir = app_root
        db_path = os.path.join(db_dir, "app.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
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
