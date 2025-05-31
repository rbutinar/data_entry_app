import os
import sys
import inspect

# Add the parent directory to sys.path
current_dir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from sqlalchemy import inspect
from backend.database.connection import get_engine, get_db
from backend.models.models import User, Table, UserTableAccess
from sqlalchemy.orm import Session

def setup_tables():
    """
    Set up tables and user access for development.
    This script will:
    1. Find all tables in the database
    2. Add them to the 'tables' table if they don't exist
    3. Grant access to the development user (ID 999)
    """
    print("Starting table setup...")
    
    # Create a database session
    db = next(get_db())
    
    try:
        # Get all tables from the database
        inspector = inspect(get_engine())
        db_tables = inspector.get_table_names()
        print(f"Found tables in database: {db_tables}")
        
        # Filter out system tables
        tables_to_add = [t for t in db_tables if t not in ['alembic_version']]
        
        # Add tables to the 'tables' table
        for idx, table_name in enumerate(tables_to_add):
            # Check if table already exists in our Table model
            existing_table = db.query(Table).filter(Table.name == table_name).first()
            
            if not existing_table:
                print(f"Adding table '{table_name}' to the tables table")
                new_table = Table(
                    id=idx + 1,  # Simple ID assignment
                    name=table_name,
                    description=f"{table_name.capitalize()} table"
                )
                db.add(new_table)
        
        # Commit changes to the database
        db.commit()
        
        # Get all tables from our Table model
        tables = db.query(Table).all()
        print(f"Tables in 'tables' table: {[t.name for t in tables]}")
        
        # Create a development user if it doesn't exist
        dev_user = db.query(User).filter(User.id == 999).first()
        if not dev_user:
            print("Creating development user")
            dev_user = User(
                id=999,
                email="dev@example.com",
                name="Development User"
            )
            db.add(dev_user)
            db.commit()
        
        # Grant access to all tables for the development user
        for table in tables:
            # Check if access already exists
            existing_access = db.query(UserTableAccess).filter(
                UserTableAccess.user_id == 999,
                UserTableAccess.table_id == table.id
            ).first()
            
            if not existing_access:
                print(f"Granting access to table '{table.name}' for development user")
                access = UserTableAccess(
                    user_id=999,
                    table_id=table.id
                )
                db.add(access)
        
        # Commit changes to the database
        db.commit()
        print("Table setup completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error setting up tables: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    setup_tables()
