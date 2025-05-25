import os
import sys
import inspect

# Add the parent directory to sys.path
current_dir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from sqlalchemy import text
from backend.database.connection import get_db
from backend.models.models import User, Table, UserTableAccess
from sqlalchemy.orm import Session

def insert_sample_data():
    """
    Insert sample data into the database tables.
    This script will:
    1. Insert a development user
    2. Insert sample tables
    3. Grant access to the tables for the development user
    """
    print("Starting sample data insertion...")
    
    # Create a database session
    db = next(get_db())
    
    try:
        # Insert development user if it doesn't exist
        dev_user = db.query(User).filter(User.email == "dev@example.com").first()
        if not dev_user:
            print("Creating development user")
            dev_user = User(
                email="dev@example.com",
                name="Development User"
            )
            db.add(dev_user)
            db.commit()
            db.refresh(dev_user)
            print(f"Created user with ID: {dev_user.id}")
        else:
            print(f"Development user already exists with ID: {dev_user.id}")
        
        # Insert sample tables
        sample_tables = [
            {"name": "customers", "description": "Customer information"},
            {"name": "orders", "description": "Order details"},
            {"name": "products", "description": "Product catalog"}
        ]
        
        created_tables = []
        for table_data in sample_tables:
            existing_table = db.query(Table).filter(Table.name == table_data["name"]).first()
            if not existing_table:
                print(f"Creating table '{table_data['name']}'")
                new_table = Table(
                    name=table_data["name"],
                    description=table_data["description"]
                )
                db.add(new_table)
                db.commit()
                db.refresh(new_table)
                created_tables.append(new_table)
                print(f"Created table with ID: {new_table.id}")
            else:
                print(f"Table '{table_data['name']}' already exists with ID: {existing_table.id}")
                created_tables.append(existing_table)
        
        # Grant access to all tables for the development user
        for table in created_tables:
            # Check if access already exists
            existing_access = db.query(UserTableAccess).filter(
                UserTableAccess.user_id == dev_user.id,
                UserTableAccess.table_id == table.id
            ).first()
            
            if not existing_access:
                print(f"Granting access to table '{table.name}' for development user")
                access = UserTableAccess(
                    user_id=dev_user.id,
                    table_id=table.id
                )
                db.add(access)
        
        # Commit changes to the database
        db.commit()
        print("Sample data insertion completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error inserting sample data: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    insert_sample_data()
