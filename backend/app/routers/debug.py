from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from backend.database.connection import get_db, engine
from backend.models.models import User, Table, UserTableAccess
from typing import List, Dict, Any

router = APIRouter()

@router.patch("/test-table-data/{table_name}/{row_id}")
async def update_test_table_row(
    table_name: str,
    row_id: int,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Test endpoint to update a row in a table without authentication.
    """
    try:
        print(f"\n\n=== UPDATE TEST TABLE ROW ===\nTable: {table_name}\nRow ID: {row_id}\nUpdates: {updates}\n===========================")
        
        # Check if the table exists in the database schema
        from sqlalchemy import inspect, text
        inspector = inspect(db.get_bind())
        db_table_names = inspector.get_table_names()
        
        if table_name not in db_table_names:
            return {"success": False, "error": f"Table '{table_name}' not found in database"}
        
        try:
            # Try direct raw SQL execution using pyodbc for better permission handling
            # Get the raw connection from SQLAlchemy
            connection = db.connection()
            cursor = connection.connection.cursor()
            
            # Build the update query using parameterized statements
            set_parts = []
            values = []
            
            for key, value in updates.items():
                set_parts.append(f"{key} = ?")
                values.append(value)
                
            # Add the row_id parameter at the end
            values.append(row_id)
            
            set_clause = ", ".join(set_parts)
            query = f"UPDATE {table_name} SET {set_clause} WHERE id = ?"
            print(f"Executing query: {query} with values: {values}")
            
            try:
                # Execute the update
                cursor.execute(query, values)
                rows_affected = cursor.rowcount
                connection.commit()
                
                if rows_affected == 0:
                    return {"success": False, "error": f"Row {row_id} not found in table {table_name}"}
                else:
                    return {"success": True, "message": f"Row {row_id} updated successfully in table {table_name}"}
                    
            except Exception as sql_error:
                # Roll back on error
                connection.rollback()
                print(f"SQL Error: {sql_error}")
                return {"success": False, "error": f"SQL Error: {str(sql_error)}"}
        except Exception as conn_error:
            print(f"Connection error: {conn_error}")
            return {"success": False, "error": f"Connection error: {str(conn_error)}"}
            
    except Exception as e:
        print(f"Error updating row: {str(e)}")
        return {"success": False, "error": f"Error updating row: {str(e)}"}

@router.post("/test-table-data/{table_name}")
async def insert_test_table_row(
    table_name: str,
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Test endpoint to insert a row into a table without authentication.
    """
    try:
        print(f"\n\n=== INSERT TEST TABLE ROW ===\nTable: {table_name}\nData: {data}\n===========================")
        
        # Check if the table exists in the database schema
        from sqlalchemy import inspect, text
        inspector = inspect(db.get_bind())
        db_table_names = inspector.get_table_names()
        
        if table_name not in db_table_names:
            return {"success": False, "error": f"Table '{table_name}' not found in database"}
        
        try:
            # Try direct raw SQL execution using pyodbc for better permission handling
            # Get the raw connection from SQLAlchemy
            connection = db.connection()
            cursor = connection.connection.cursor()
            
            # Build the insert query using parameterized statements for security
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["?" for _ in data.keys()])
            values = list(data.values())
            
            # Use direct SQL execution with pyodbc
            try:
                # For SQL Server, we use this format to get back the inserted ID
                query = f"INSERT INTO {table_name} ({columns}) OUTPUT INSERTED.id VALUES ({placeholders})"
                print(f"Executing query: {query} with values: {values}")
                
                cursor.execute(query, values)
                row = cursor.fetchone()
                if row:
                    new_id = row[0]
                else:
                    new_id = None
                    
                # Commit the transaction
                connection.commit()
                
                if new_id is not None:
                    return {
                        "success": True, 
                        "id": new_id, 
                        "message": f"Row inserted successfully into table {table_name}"
                    }
                else:
                    return {
                        "success": True, 
                        "id": 9999, 
                        "message": f"Row inserted successfully into table {table_name} but ID not returned"
                    }
                    
            except Exception as sql_error:
                # Roll back on error
                connection.rollback()
                print(f"SQL Error: {sql_error}")
                # Return a detailed error message
                error_msg = str(sql_error)
                return {
                    "success": False, 
                    "error": f"Database error: {error_msg}"
                }
        except Exception as conn_error:
            print(f"Connection error: {conn_error}")
            return {
                "success": False, 
                "error": f"Connection error: {str(conn_error)}"
            }
    except Exception as e:
        print(f"Error inserting row: {str(e)}")
        return {
            "success": False, 
            "error": f"Error inserting row: {str(e)}"
        }

@router.delete("/test-table-data/{table_name}/{row_id}")
async def delete_test_table_row(
    table_name: str,
    row_id: int,
    db: Session = Depends(get_db)
):
    """
    Test endpoint to delete a row from a table without authentication.
    """
    try:
        print(f"\n\n=== DELETE TEST TABLE ROW ===\nTable: {table_name}\nRow ID: {row_id}\n===========================")
        
        # Check if the table exists in the database schema
        from sqlalchemy import inspect, text
        inspector = inspect(db.get_bind())
        db_table_names = inspector.get_table_names()
        
        if table_name not in db_table_names:
            return {"success": False, "error": f"Table '{table_name}' not found in database"}
        
        try:
            # Try direct raw SQL execution using pyodbc for better permission handling
            # Get the raw connection from SQLAlchemy
            connection = db.connection()
            cursor = connection.connection.cursor()
            
            # Build the delete query using parameterized statements
            query = f"DELETE FROM {table_name} WHERE id = ?"
            print(f"Executing query: {query} with values: [{row_id}]")
            
            try:
                # Execute the delete
                cursor.execute(query, [row_id])
                rows_affected = cursor.rowcount
                connection.commit()
                
                if rows_affected == 0:
                    return {"success": False, "error": f"Row {row_id} not found in table {table_name}"}
                else:
                    return {"success": True, "message": f"Row {row_id} deleted successfully from table {table_name}"}
                    
            except Exception as sql_error:
                # Roll back on error
                connection.rollback()
                print(f"SQL Error: {sql_error}")
                return {"success": False, "error": f"SQL Error: {str(sql_error)}"}
        except Exception as conn_error:
            print(f"Connection error: {conn_error}")
            return {"success": False, "error": f"Connection error: {str(conn_error)}"}
    except Exception as e:
        print(f"Error deleting row: {str(e)}")
        return {"success": False, "error": f"Error deleting row: {str(e)}"}

@router.get("/test-table-data/{table_name}")
async def get_test_table_data(
    table_name: str,
    page: int = 1,
    page_size: int = 50,
    filter_column: str = None,
    filter_value: str = None,
    db: Session = Depends(get_db)
):
    """
    Test endpoint to get data from a table without authentication.
    """
    try:
        print(f"\n\n=== GET TEST TABLE DATA ===\nTable: {table_name}\n=========================")
        
        # Check if the table exists in the database schema
        from sqlalchemy import inspect, text
        inspector = inspect(db.get_bind())
        db_table_names = inspector.get_table_names()
        
        if table_name not in db_table_names:
            return {
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "data": [],
                "error": f"Table '{table_name}' not found in database"
            }
        
        # Build the query
        query = f"SELECT * FROM {table_name}"
        count_query = f"SELECT COUNT(*) AS total FROM {table_name}"
        
        # Add filtering if specified
        if filter_column and filter_value:
            query += f" WHERE {filter_column} LIKE '%{filter_value}%'"
            count_query += f" WHERE {filter_column} LIKE '%{filter_value}%'"
        
        # Add pagination
        query += f" ORDER BY (SELECT NULL) OFFSET {(page - 1) * page_size} ROWS FETCH NEXT {page_size} ROWS ONLY"
        
        # Execute the queries
        with engine.connect() as connection:
            # Get total count
            result = connection.execute(text(count_query))
            total_count = result.scalar() or 0
            
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
                "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
                "data": data
            }
    except Exception as e:
        print(f"Error getting table data: {str(e)}")
        return {
            "total": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 0,
            "data": [],
            "error": f"Error: {str(e)}"
        }

@router.get("/test-tables")
async def get_test_tables(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Test endpoint to get all tables without authentication.
    """
    try:
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
                tables.append({
                    "id": idx + 1,
                    "name": table_name,
                    "description": f"{table_name.capitalize()} table"
                })
        
        print(f"Final tables list: {[t['name'] for t in tables]}")
        return tables
    except Exception as e:
        print(f"Error getting tables: {str(e)}")
        return [{"id": 0, "name": f"Error: {str(e)}", "description": "Error getting tables"}]

@router.get("/db-info")
async def get_db_info(db: Session = Depends(get_db)):
    """
    Debug endpoint to get database information.
    """
    try:
        # Check connection
        connection_result = "Connection successful"
        
        # Get database tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        # Get users
        users_query = text("SELECT * FROM users")
        try:
            users_result = db.execute(users_query).fetchall()
            users = [dict(zip(user.keys(), user)) for user in users_result]
        except Exception as e:
            users = f"Error querying users: {str(e)}"
        
        # Get tables from Table model
        try:
            table_models = db.query(Table).all()
            table_models_list = [{"id": t.id, "name": t.name, "description": t.description} for t in table_models]
        except Exception as e:
            table_models_list = f"Error querying Table model: {str(e)}"
            
        # Get user table access
        try:
            access_models = db.query(UserTableAccess).all()
            access_list = [{"user_id": a.user_id, "table_id": a.table_id} for a in access_models]
        except Exception as e:
            access_list = f"Error querying UserTableAccess model: {str(e)}"
        
        return {
            "connection": connection_result,
            "database_tables": tables,
            "table_models": table_models_list,
            "users": users,
            "user_table_access": access_list
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Error connecting to database"
        }
