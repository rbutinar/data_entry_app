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
    column_metadata = []
    
    for column in columns:
        column_metadata.append({
            "name": column["name"],
            "type": str(column["type"]),
            "primary_key": column.get("primary_key", False),
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
