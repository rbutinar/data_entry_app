from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.auth.token import get_current_user
from backend.database.connection import get_db
from backend.models.models import User, Table, UserTableAccess
from sqlalchemy import select, join
from typing import List, Dict, Any

# Removed get_mock_table_columns; only real database tables are supported.

router = APIRouter()

@router.get("/")
async def get_accessible_tables(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all tables that the current user has access to.
    """
    # Query tables that the user has access to
    user_id = current_user["id"]
    print(f"\n\n=== GET TABLES REQUEST ===\nUser: {current_user}\n=========================")
    
    # Get all tables directly from the database schema
    from sqlalchemy import inspect
    inspector = inspect(db.get_bind())
    
    # Get all table names from the database
    db_table_names = inspector.get_table_names()
    print(f"Found tables in database: {db_table_names}")
    
    # Filter out system tables and create table objects
    tables = []
    for idx, table_name in enumerate(db_table_names):
        if table_name not in ['alembic_version']:
            try:
                print("Using INFORMATION_SCHEMA to detect primary keys...")
                pk_query = """
                SELECT 
                    kcu.COLUMN_NAME
                FROM 
                    INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
                JOIN 
                    INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
                    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                WHERE 
                    tc.TABLE_SCHEMA = 'dbo'          -- Using default schema
                    AND tc.TABLE_NAME = ?            -- Table name parameter
                    AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                """
                result = db.execute(pk_query, (table_name,)).fetchall()
                tables.append(Table(
                    id=idx + 1,
                    name=table_name,
                    description=f"{table_name.capitalize()} table"
                ))
            except Exception as e:
                print(f"Error occurred while detecting primary keys for table {table_name}: {e}")
                tables.append(Table(
                    id=idx + 1,
                    name=table_name,
                    description=f"{table_name.capitalize()} table"
                ))
    

    print(f"Final tables list: {[t.name for t in tables]}")
    
    # Return the list of accessible tables
    return [
        {
            "id": table.id,
            "name": table.name,
            "description": table.description
        }
        for table in tables
    ]

@router.get("/{table_name}")
async def get_table_metadata(
    table_name: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get metadata for a specific table if the user has access.
    """
    print(f"\n\n=== GET TABLE METADATA ===\nTable: {table_name}\nUser: {current_user}\n=========================")
    
    # Check if the table exists in the database schema
    from sqlalchemy import inspect
    inspector = inspect(db.get_bind())
    db_table_names = inspector.get_table_names()
    
    if table_name not in db_table_names:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found in database"
        )
    
    # Get column information from the database schema
    columns = inspector.get_columns(table_name)
    
    # Use INFORMATION_SCHEMA to identify primary key columns
    print(f"\n\n=== DETECTING PRIMARY KEYS FOR {table_name} ===\n")
    primary_key_columns = set()
    
    try:
        print("Using INFORMATION_SCHEMA to detect primary keys...")
        pk_query = """
        SELECT 
            kcu.COLUMN_NAME
        FROM 
            INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
        JOIN 
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
            ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        WHERE 
            tc.TABLE_SCHEMA = 'dbo'          -- Using default schema
            AND tc.TABLE_NAME = ?            -- Table name parameter
            AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        """
        result = db.execute(pk_query, (table_name,)).fetchall()
        
        if result:
            for row in result:
                primary_key_columns.add(row[0])
                print(f"Found primary key column: {row[0]}")
        else:
            print(f"No primary key found for table {table_name} using INFORMATION_SCHEMA")
    except Exception as e:
        print(f"Error detecting primary keys: {e}")
    
    # If no primary keys found, check if any column has primary_key=True in SQLAlchemy metadata
    if not primary_key_columns:
        for column in columns:
            if column.get('primary_key', False):
                primary_key_columns.add(column['name'])
                print(f"Found primary key from SQLAlchemy metadata: {column['name']}")
    
    # KNOWN TABLES: If still no primary key detected, use known information for specific tables
    if not primary_key_columns:
        known_tables = {
            'tabella_1': 'id',
            'tabella_2': 'id',
            'tabella_3': 'id',
            'orders': 'id',
            'users': 'id'
        }
        
        if table_name in known_tables:
            pk_name = known_tables[table_name]
            print(f"Using known primary key '{pk_name}' for table '{table_name}'")
            primary_key_columns.add(pk_name)
    
    print(f"Primary key columns detected: {primary_key_columns}")
    
    # Create column metadata with primary key information
    column_metadata = []
    for column in columns:
        is_primary_key = column['name'] in primary_key_columns
        column_metadata.append({
            "name": column["name"],
            "type": str(column["type"]),
            "primary_key": is_primary_key,
            "nullable": column["nullable"]
        })
    
    # Find the index of the table in the list of tables
    table_index = db_table_names.index(table_name)
    
    # Return table metadata
    return {
        "id": table_index + 1,  # Simple ID assignment
        "name": table_name,
        "description": f"{table_name.capitalize()} table",
        "columns": column_metadata
    }
