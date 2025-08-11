import os
import shutil
import sqlite3
import time
import sys
import traceback

# Debug output
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

try:
    from app.database import engine, Base, SQLALCHEMY_DATABASE_URL
    from app.models.user import User
    from app.models.project import Project
    from app.models.dashboard import Dashboard
    from app.models.task import Task
    from app.models.comment import Comment
    print("Successfully imported app modules")
except Exception as e:
    print(f"Error importing app modules: {e}")
    traceback.print_exc()

def migrate_database():
    print("Starting database migration...")
    print(f"Database URL: {SQLALCHEMY_DATABASE_URL}")
    
    # Extract the SQLite file path from the SQLAlchemy URL
    # Format is typically: sqlite:///path/to/file.db
    db_path = SQLALCHEMY_DATABASE_URL.replace('sqlite:///', '')
    print(f"Database file path: {db_path}")
    
    # Make backup of existing database if it exists
    if os.path.isfile(db_path):
        timestamp = int(time.time())
        backup_path = f"{db_path}.backup_{timestamp}"
        print(f"Backing up existing database to {backup_path}")
        try:
            shutil.copy2(db_path, backup_path)
            print(f"Database backed up successfully")
            
            # Let's see the schema in the current database
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users';")
                schema = cursor.fetchone()
                print(f"Current users table schema: {schema}")
                conn.close()
            except Exception as e:
                print(f"Error checking schema: {e}")
        except Exception as e:
            print(f"Backup failed: {e}")
    
    # Apply lightweight migrations without full drop in production-like flow
    print("\nApplying SQL migrations if needed...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        # Add is_system to comments
        try:
            cursor.execute("ALTER TABLE comments ADD COLUMN is_system BOOLEAN DEFAULT FALSE;")
            print("Added is_system to comments")
        except Exception:
            print("is_system already exists or table missing")
        # Add reviewer_id to tasks
        try:
            cursor.execute("ALTER TABLE tasks ADD COLUMN reviewer_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL;")
            print("Added reviewer_id to tasks")
        except Exception:
            print("reviewer_id already exists or table missing")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Migration alter error: {e}")
    
    print("\nEnsuring tables exist...")
    Base.metadata.create_all(bind=engine)
    
    # Confirm the new schema
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users';")
        schema = cursor.fetchone()
        print(f"\nNew users table schema: {schema}")
        conn.close()
    except Exception as e:
        print(f"Error checking new schema: {e}")
    
    print("\nDatabase migration completed successfully!")

if __name__ == "__main__":
    migrate_database()
