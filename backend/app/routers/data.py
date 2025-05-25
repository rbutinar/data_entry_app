from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, Table as SQLATable, MetaData
from typing import Dict, Any, Optional, List
from backend.app.auth.token import get_current_user
from backend.database.connection import get_db, engine
from backend.models.models import User, Table, UserTableAccess

router = APIRouter()

def get_mock_data(table_name: str) -> list:
    """
    Return mock data for development tables.
    """
    if table_name == "customers":
        return [
            {"id": 1, "first_name": "John", "last_name": "Doe", "email": "john.doe@example.com", "phone": "555-123-4567", "address": "123 Main St", "city": "New York", "country": "USA"},
            {"id": 2, "first_name": "Jane", "last_name": "Smith", "email": "jane.smith@example.com", "phone": "555-987-6543", "address": "456 Oak Ave", "city": "Los Angeles", "country": "USA"},
            {"id": 3, "first_name": "Michael", "last_name": "Johnson", "email": "michael.j@example.com", "phone": "555-567-8901", "address": "789 Pine Rd", "city": "Chicago", "country": "USA"},
            {"id": 4, "first_name": "Emily", "last_name": "Brown", "email": "emily.b@example.com", "phone": "555-234-5678", "address": "321 Elm St", "city": "Houston", "country": "USA"},
            {"id": 5, "first_name": "David", "last_name": "Wilson", "email": "david.w@example.com", "phone": "555-345-6789", "address": "654 Maple Dr", "city": "Phoenix", "country": "USA"}
        ]
    elif table_name == "orders":
        return [
            {"id": 1, "customer_id": 1, "order_date": "2023-01-15", "total_amount": 125.99, "status": "Completed"},
            {"id": 2, "customer_id": 2, "order_date": "2023-02-20", "total_amount": 89.50, "status": "Completed"},
            {"id": 3, "customer_id": 3, "order_date": "2023-03-10", "total_amount": 210.75, "status": "Processing"},
            {"id": 4, "customer_id": 1, "order_date": "2023-04-05", "total_amount": 45.25, "status": "Completed"},
            {"id": 5, "customer_id": 4, "order_date": "2023-05-12", "total_amount": 175.00, "status": "Shipped"}
        ]
    elif table_name == "products":
        return [
            {"id": 1, "name": "Laptop", "description": "High-performance laptop with 16GB RAM", "price": 999.99, "category": "Electronics", "stock": 25},
            {"id": 2, "name": "Smartphone", "description": "Latest model with 128GB storage", "price": 699.99, "category": "Electronics", "stock": 50},
            {"id": 3, "name": "Desk Chair", "description": "Ergonomic office chair", "price": 199.99, "category": "Furniture", "stock": 15},
            {"id": 4, "name": "Coffee Maker", "description": "Programmable coffee maker", "price": 49.99, "category": "Appliances", "stock": 30},
            {"id": 5, "name": "Headphones", "description": "Noise-cancelling wireless headphones", "price": 149.99, "category": "Electronics", "stock": 40}
        ]
    else:
        return []

async def check_table_access(
    table_name: str, 
    user_id: int, 
    db: Session
) -> bool:
    """
    Check if the user has access to the specified table.
    """
    # For development mode: If user_id is 999, allow access to any table
    if user_id == 999:
        print(f"Development mode: Allowing access to table '{table_name}' for development user")
        # For development tables that don't exist in the database
        dev_tables = ["customers", "orders", "products"]
        if table_name in dev_tables:
            return True
    
    # Get the table ID
    table = db.query(Table).filter(Table.name == table_name).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found"
        )
    
    # For development mode: If user_id is 999, allow access to any table in the database
    if user_id == 999:
        return True
    
    # Check user access
    access = db.query(UserTableAccess).filter(
        UserTableAccess.user_id == user_id,
        UserTableAccess.table_id == table.id
    ).first()
    
    if not access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have access to table '{table_name}'"
        )
    
    return True

@router.get("/{table_name}")
async def get_table_data(
    table_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    filter_column: Optional[str] = None,
    filter_value: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get data from a table with pagination and optional filtering.
    """
    print(f"\n\n=== GET TABLE DATA ===\nTable: {table_name}\nUser: {current_user}\n======================")
    
    # For development tables, return mock data
    dev_tables = ["customers", "orders", "products"]
    if table_name in dev_tables:
        print(f"Returning mock data for table '{table_name}'")
        # Return mock data based on the table name
        mock_data = get_mock_data(table_name)
        
        # Apply filtering if specified
        if filter_column and filter_value:
            filtered_data = []
            for item in mock_data:
                if filter_column in item and filter_value.lower() in str(item[filter_column]).lower():
                    filtered_data.append(item)
            mock_data = filtered_data
        
        # Apply pagination
        total_count = len(mock_data)
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total_count)
        paginated_data = mock_data[start_idx:end_idx]
        
        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size,
            "data": paginated_data
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
    
    # Calculate offset for pagination
    offset = (page - 1) * page_size
    
    # Build the query
    query = f"SELECT * FROM {table_name}"
    count_query = f"SELECT COUNT(*) AS total FROM {table_name}"
    
    # Add filtering if specified
    if filter_column and filter_value:
        query += f" WHERE {filter_column} LIKE '%{filter_value}%'"
        count_query += f" WHERE {filter_column} LIKE '%{filter_value}%'"
    
    # Add pagination
    query += f" ORDER BY (SELECT NULL) OFFSET {offset} ROWS FETCH NEXT {page_size} ROWS ONLY"
    
    try:
        # Execute the queries
        with engine.connect() as connection:
            # Get total count
            result = connection.execute(text(count_query))
            total_count = result.scalar()
            
            # Get paginated data
            result = connection.execute(text(query))
            rows = result.fetchall()
            
            # Get column names
            columns = result.keys()
            
            # Convert rows to dictionaries
            data = [dict(zip(columns, row)) for row in rows]
            
            # Return data with pagination info
            return {
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size,
                "data": data
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying table: {str(e)}"
        )

@router.patch("/{table_name}/{row_id}")
async def update_row(
    table_name: str,
    row_id: int,
    updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a specific row in a table.
    """
    # Check if user has access to the table
    await check_table_access(table_name, current_user["id"], db)
    
    # Build the update query
    set_clause = ", ".join([f"{key} = :{key}" for key in updates.keys()])
    query = f"UPDATE {table_name} SET {set_clause} WHERE id = :row_id"
    
    # Add row_id to the parameters
    params = {**updates, "row_id": row_id}
    
    try:
        # Execute the update
        with engine.connect() as connection:
            result = connection.execute(text(query), params)
            connection.commit()
            
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Row with ID {row_id} not found in table '{table_name}'"
                )
            
            return {"message": f"Row {row_id} updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating row: {str(e)}"
        )

@router.post("/{table_name}")
async def insert_row(
    table_name: str,
    data: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Insert a new row into a table.
    """
    # Check if user has access to the table
    await check_table_access(table_name, current_user["id"], db)
    
    # Build the insert query
    columns = ", ".join(data.keys())
    placeholders = ", ".join([f":{key}" for key in data.keys()])
    query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
    
    try:
        # Execute the insert
        with engine.connect() as connection:
            result = connection.execute(text(query), data)
            connection.commit()
            
            # In a real implementation, you would return the ID of the newly inserted row
            return {"message": "Row inserted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inserting row: {str(e)}"
        )

@router.delete("/{table_name}/{row_id}")
async def delete_row(
    table_name: str,
    row_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific row from a table.
    """
    # Check if user has access to the table
    await check_table_access(table_name, current_user["id"], db)
    
    # Build the delete query
    query = f"DELETE FROM {table_name} WHERE id = :row_id"
    
    try:
        # Execute the delete
        with engine.connect() as connection:
            result = connection.execute(text(query), {"row_id": row_id})
            connection.commit()
            
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Row with ID {row_id} not found in table '{table_name}'"
                )
            
            return {"message": f"Row {row_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting row: {str(e)}"
        )
