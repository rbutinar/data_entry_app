from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, Table as SQLATable, MetaData
from typing import Dict, Any, Optional, List
from backend.app.auth.token import get_current_user
from backend.database.connection import get_db, engine
from backend.models.models import User, Table, UserTableAccess
from backend.app.routers.debug import is_identity_column

router = APIRouter()

# Removed get_mock_data; only real database tables are supported.

@router.get("/metadata/{table_name}")
async def get_table_metadata(
    table_name: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get metadata for a specific table including column information and primary key.
    """
    # Check if user has access to the table
    await check_table_access(table_name, current_user["id"], db)
    
    try:
        # Get table columns and their types
        from sqlalchemy import inspect
        inspector = inspect(db.get_bind())
        
        # Get column information
        columns = inspector.get_columns(table_name)
        column_info = [{
            "name": column["name"],
            "type": str(column["type"]),
            "nullable": column["nullable"]
        } for column in columns]
        
        # Get primary key information
        pk_constraint = inspector.get_pk_constraint(table_name)
        primary_key = pk_constraint["constrained_columns"][0] if pk_constraint and pk_constraint["constrained_columns"] else "id"
        
        print(f"Primary key for table {table_name}: {primary_key}")
        
        # Check if the primary key is auto-incrementing
        is_auto_increment = False
        try:
            connection = db.connection()
            is_auto_increment = is_identity_column(connection, table_name, primary_key)
            print(f"Is primary key auto-incrementing: {is_auto_increment}")
        except Exception as e:
            print(f"Error checking if primary key is auto-incrementing: {e}")
        
        return {
            "success": True,
            "table_name": table_name,
            "columns": column_info,
            "primary_key": primary_key,
            "is_auto_increment": is_auto_increment
        }
    except Exception as e:
        print(f"Error getting table metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting table metadata: {str(e)}"
        )

async def check_table_access(
    table_name: str, 
    user_id: int, 
    db: Session
) -> bool:
    """
    Check if the user has access to the specified table.
    """
    # For development mode: If user_id is 999 or 1, allow access to any table
    if user_id == 999 or user_id == 1:
        print(f"Development mode: Allowing access to table '{table_name}' for user ID {user_id}")
        
        # Check if the table exists in the database schema
        from sqlalchemy import inspect
        inspector = inspect(db.get_bind())
        db_table_names = inspector.get_table_names()
        
        if table_name not in db_table_names:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table '{table_name}' not found in database"
            )
        
        return True
    
    # Get the table ID
    table = db.query(Table).filter(Table.name == table_name).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found"
        )
    
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
    pk: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a specific row in a table.
    """
    # Check if user has access to the table
    await check_table_access(table_name, current_user["id"], db)
    
    try:
        # Try direct raw SQL execution using pyodbc for better permission handling
        # Get the raw connection from SQLAlchemy
        connection = db.connection()
        cursor = connection.connection.cursor()

        # Use provided primary key column name if available, otherwise detect it dynamically
        if pk:
            print(f"[DEBUG] Using provided primary key column: {pk}")
            pk_col = pk
        else:
            # Dynamically detect the primary key column for the table
            from sqlalchemy import inspect
            print("[DEBUG] Inspecting table for primary key...")
            inspector = inspect(db.get_bind())
            pk_cols = inspector.get_pk_constraint(table_name, schema="dbo")
            print(f"[DEBUG] PK constraint info: {pk_cols}")
            if not pk_cols or not pk_cols['constrained_columns']:
                print(f"[ERROR] Table {table_name} has no primary key.")
                raise HTTPException(status_code=500, detail=f"Table {table_name} has no primary key.")
            pk_col = pk_cols['constrained_columns'][0]
            print(f"[DEBUG] Using detected primary key column: {pk_col}")

        # Build the update query using parameterized statements
        set_parts = []
        values = []

        for key, value in updates.items():
            set_parts.append(f"{key} = ?")
            values.append(value)

        # Add the row_id parameter at the end
        values.append(row_id)

        set_clause = ", ".join(set_parts)
        query = f"UPDATE {table_name} SET {set_clause} WHERE {pk_col} = ?"
        print(f"Executing query: {query} with values: {values}")

        try:
            # Execute the update
            cursor.execute(query, values)
            rows_affected = cursor.rowcount
            connection.commit()

            if rows_affected == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Row {row_id} not found in table {table_name}"
                )
            else:
                return {"message": f"Row {row_id} updated successfully"}

        except Exception as sql_error:
            # Roll back on error
            connection.rollback()
            print(f"SQL Error: {sql_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(sql_error)}"
            )
    except Exception as e:
        print(f"General Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating row: {str(e)}"
        )

@router.post("/{table_name}")
async def insert_row(
    table_name: str,
    data: Dict[str, Any],
    pk: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Insert a new row into a table.
    """
    # Check if user has access to the table
    await check_table_access(table_name, current_user["id"], db)
    
    try:
        # Try direct raw SQL execution using pyodbc for better permission handling
        # Get the raw connection from SQLAlchemy
        connection = db.connection()
        cursor = connection.connection.cursor()

        # Use provided primary key column name if available, otherwise detect it dynamically
        if pk:
            print(f"[DEBUG] Using provided primary key column: {pk}")
            pk_col = pk
        else:
            # Dynamically detect the primary key column for the table
            from sqlalchemy import inspect
            print("[DEBUG] Inspecting table for primary key...")
            inspector = inspect(db.get_bind())
            pk_cols = inspector.get_pk_constraint(table_name, schema="dbo")
            print(f"[DEBUG] PK constraint info: {pk_cols}")
            if not pk_cols or not pk_cols['constrained_columns']:
                pk_col = None
                print(f"[DEBUG] No primary key found for table {table_name}")
            else:
                pk_col = pk_cols['constrained_columns'][0]
                print(f"[DEBUG] Using detected primary key column: {pk_col}")

        # Build the insert query using parameterized statements for security
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["?" for _ in data.keys()])
        values = list(data.values())

        # Use direct SQL execution with pyodbc
        try:
            if pk_col:
                try:
                    # For SQL Server, we use this format to get back the inserted PK (if exists)
                    query = f"INSERT INTO {table_name} ({columns}) OUTPUT INSERTED.{pk_col} VALUES ({placeholders})"
                    print(f"Executing query: {query} with values: {values}")

                    cursor.execute(query, values)
                    row = cursor.fetchone()
                    new_id = row[0] if row else None
                    
                    # Commit the transaction
                    connection.commit()
                    
                    if new_id is not None:
                        # Return the inserted row data with the primary key
                        return_data = {
                            "message": "Row inserted successfully",
                            pk_col: new_id
                        }
                        
                        # Add all the original data to the response
                        for key, value in data.items():
                            if key != pk_col:  # Don't override the primary key
                                return_data[key] = value
                                
                        return return_data
                    else:
                        # Fallback to simple insert if OUTPUT INSERTED didn't return an ID
                        print("OUTPUT INSERTED didn't return an ID, using original data")
                        return_data = {"message": "Row inserted successfully"}
                        
                        # Add all the original data to the response
                        for key, value in data.items():
                            return_data[key] = value
                            
                        return return_data
                        
                except Exception as output_error:
                    # If OUTPUT INSERTED fails (e.g., for tables without auto-increment),
                    # try a simpler insert and then select the inserted data
                    print(f"OUTPUT INSERTED failed: {output_error}, trying alternate approach")
                    
                    # Rollback the failed transaction
                    connection.rollback()
                    
                    # Try a simple insert without OUTPUT
                    simple_query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
                    print(f"Executing simple query: {simple_query} with values: {values}")
                    
                    cursor.execute(simple_query, values)
                    connection.commit()
                    
                    # Return the original data as the response
                    return_data = {"message": "Row inserted successfully using alternate method"}
                    
                    # Add all the original data to the response
                    for key, value in data.items():
                        return_data[key] = value
                        
                    return return_data
            else:
                # No primary key column, use simple insert
                query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
                print(f"Executing query: {query} with values: {values}")

                cursor.execute(query, values)
                connection.commit()
                
                # Return the original data as the response
                return_data = {"message": "Row inserted successfully"}
                
                # Add all the original data to the response
                for key, value in data.items():
                    return_data[key] = value
                    
                return return_data

        except Exception as sql_error:
            # Roll back on error
            connection.rollback()
            print(f"SQL Error: {sql_error}")
            # Return a detailed error message
            error_msg = str(sql_error)
            print(f"SQL Error: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {error_msg}"
            )
    except Exception as e:
        print(f"General Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inserting row: {str(e)}"
        )

@router.delete("/{table_name}/{row_id}")
async def delete_row(
    table_name: str,
    row_id: int,
    pk: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific row from a table.
    """
    print(f"[DEBUG] DELETE endpoint called for table: {table_name}, row_id: {row_id}, user: {current_user}")
    try:
        print("[DEBUG] Checking table access...")
        await check_table_access(table_name, current_user["id"], db)
        print("[DEBUG] Table access granted.")
        
        # Try direct raw SQL execution using pyodbc for better permission handling
        print("[DEBUG] Getting raw connection from SQLAlchemy...")
        connection = db.connection()
        cursor = connection.connection.cursor()
        print("[DEBUG] Raw connection and cursor acquired.")
        
        # Use provided primary key column name if available, otherwise detect it dynamically
        if pk:
            print(f"[DEBUG] Using provided primary key column: {pk}")
            pk_col = pk
        else:
            # Dynamically detect the primary key column for the table
            from sqlalchemy import inspect
            print("[DEBUG] Inspecting table for primary key...")
            inspector = inspect(db.get_bind())
            pk_cols = inspector.get_pk_constraint(table_name, schema="dbo")
            print(f"[DEBUG] PK constraint info: {pk_cols}")
            if not pk_cols or not pk_cols['constrained_columns']:
                print(f"[ERROR] Table {table_name} has no primary key.")
                raise HTTPException(status_code=500, detail=f"Table {table_name} has no primary key.")
            pk_col = pk_cols['constrained_columns'][0]
            print(f"[DEBUG] Using detected primary key column: {pk_col}")

        # Build the delete query using parameterized statements
        query = f"DELETE FROM {table_name} WHERE {pk_col} = ?"
        print(f"[DEBUG] Prepared query: {query} with values: [{row_id}]")
        
        try:
            print("[DEBUG] Executing delete query...")
            cursor.execute(query, [row_id])
            rows_affected = cursor.rowcount
            print(f"[DEBUG] Rows affected: {rows_affected}")
            print("[DEBUG] Committing transaction...")
            connection.commit()
            print("[DEBUG] Transaction committed.")
            
            if rows_affected == 0:
                print(f"[DEBUG] No rows found to delete for row_id {row_id} in table {table_name}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Row {row_id} not found in table {table_name}"
                )
            else:
                print(f"[DEBUG] Row {row_id} deleted successfully from table {table_name}")
                return {"message": f"Row {row_id} deleted successfully"}
                
        except Exception as sql_error:
            print(f"[ERROR] SQL error during delete: {sql_error}")
            # Roll back on error
            connection.rollback()
            print(f"[DEBUG] Rolled back transaction due to SQL error.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(sql_error)}"
            )
    except Exception as e:
        print(f"[ERROR] General error in delete_row: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting row: {str(e)}"
        )
