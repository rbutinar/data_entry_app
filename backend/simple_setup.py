import os
import sys
import inspect

# Add the parent directory to sys.path
current_dir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from sqlalchemy import inspect, text
from backend.database.connection import engine, get_db
from sqlalchemy.orm import Session

def list_database_tables():
    """
    List all tables in the database and their structures.
    This is useful for development to understand what tables are available.
    """
    print("Listing database tables...")
    
    # Create a database session
    db = next(get_db())
    
    try:
        # Get all tables from the database
        inspector = inspect(engine)
        db_tables = inspector.get_table_names()
        print(f"Found tables in database: {db_tables}")
        
        # For each table, get its columns
        for table_name in db_tables:
            print(f"\nTable: {table_name}")
            columns = inspector.get_columns(table_name)
            print("Columns:")
            for column in columns:
                print(f"  - {column['name']}: {column['type']} (nullable: {column['nullable']})")
            
            # Try to get a sample of data
            try:
                query = text(f"SELECT TOP 5 * FROM {table_name}")
                result = db.execute(query).fetchall()
                if result:
                    print("Sample data:")
                    for row in result:
                        print(f"  {dict(row)}")
                else:
                    print("No data in table")
            except Exception as e:
                print(f"Error getting sample data: {str(e)}")
        
        print("\nDatabase inspection completed!")
        
    except Exception as e:
        print(f"Error inspecting database: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    list_database_tables()
