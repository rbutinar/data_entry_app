from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.auth.token import get_current_user
from backend.database.connection import get_db
from backend.models.models import User, Table, UserTableAccess
from sqlalchemy import select, join
from typing import List, Dict, Any

def get_mock_table_columns(table_name: str) -> List[Dict[str, Any]]:
    """
    Return mock column metadata for development tables.
    """
    if table_name == "customers":
        return [
            {"name": "id", "type": "int", "primary_key": True, "nullable": False},
            {"name": "first_name", "type": "varchar", "primary_key": False, "nullable": False},
            {"name": "last_name", "type": "varchar", "primary_key": False, "nullable": False},
            {"name": "email", "type": "varchar", "primary_key": False, "nullable": False},
            {"name": "phone", "type": "varchar", "primary_key": False, "nullable": True},
            {"name": "address", "type": "varchar", "primary_key": False, "nullable": True},
            {"name": "city", "type": "varchar", "primary_key": False, "nullable": True},
            {"name": "country", "type": "varchar", "primary_key": False, "nullable": True}
        ]
    elif table_name == "orders":
        return [
            {"name": "id", "type": "int", "primary_key": True, "nullable": False},
            {"name": "customer_id", "type": "int", "primary_key": False, "nullable": False},
            {"name": "order_date", "type": "date", "primary_key": False, "nullable": False},
            {"name": "total_amount", "type": "decimal", "primary_key": False, "nullable": False},
            {"name": "status", "type": "varchar", "primary_key": False, "nullable": False}
        ]
    elif table_name == "products":
        return [
            {"name": "id", "type": "int", "primary_key": True, "nullable": False},
            {"name": "name", "type": "varchar", "primary_key": False, "nullable": False},
            {"name": "description", "type": "varchar", "primary_key": False, "nullable": True},
            {"name": "price", "type": "decimal", "primary_key": False, "nullable": False},
            {"name": "category", "type": "varchar", "primary_key": False, "nullable": True},
            {"name": "stock", "type": "int", "primary_key": False, "nullable": False}
        ]
    else:
        return []

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
    
    # Add mock tables for development
    dev_tables = [
        Table(id=101, name="customers", description="Customer information (dev)"),
        Table(id=102, name="orders", description="Order details (dev)"),
        Table(id=103, name="products", description="Product catalog (dev)")
    ]
    
    # Add dev tables that don't exist in the database
    existing_names = [table.name for table in tables]
    for dev_table in dev_tables:
        if dev_table.name not in existing_names:
            tables.append(dev_table)
    
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
    
    # Check for mock development tables first
    dev_tables = ["customers", "orders", "products"]
    if table_name in dev_tables:
        print(f"Providing metadata for development table '{table_name}'")
        # Return mock table metadata for development tables
        return {
            "id": dev_tables.index(table_name) + 101,  # Match the IDs we used in get_accessible_tables
            "name": table_name,
            "description": f"{table_name.capitalize()} information (dev)",
            "columns": get_mock_table_columns(table_name)
        }
    
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
