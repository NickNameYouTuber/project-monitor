from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import sys

# Get the app's root directory
app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

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

SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
