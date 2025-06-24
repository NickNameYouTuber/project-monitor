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
    
    # Recreate database tables
    print("\nDropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables with updated schema...")
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
