from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from backend.database.connection import get_db, engine
from backend.models.models import User, Table, UserTableAccess
from typing import List, Dict, Any

router = APIRouter()

# Mock data for development tables
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
        
        # For development tables, just return success
        dev_tables = ["customers", "orders", "products"]
        if table_name in dev_tables:
            print(f"Mock update for development table '{table_name}'")
            return {"success": True, "message": f"Row {row_id} updated successfully in table {table_name} (mock)"}
        
        # Check if the table exists in the database schema
        from sqlalchemy import inspect, text
        inspector = inspect(db.get_bind())
        db_table_names = inspector.get_table_names()
        
        if table_name not in db_table_names:
            return {"success": False, "error": f"Table '{table_name}' not found in database"}
        
        # Build the update query
        set_clauses = []
        params = {}
        
        for key, value in updates.items():
            set_clauses.append(f"{key} = :value_{key}")
            params[f"value_{key}"] = value
        
        if not set_clauses:
            return {"success": False, "error": "No updates provided"}
        
        query = f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE id = :row_id"
        params["row_id"] = row_id
        
        # Execute the query
        with engine.connect() as connection:
            try:
                connection.execute(text(query), params)
                connection.commit()
                return {"success": True, "message": f"Row {row_id} updated successfully in table {table_name}"}
            except Exception as e:
                connection.rollback()
                print(f"Error executing update query: {str(e)}")
                return {"success": False, "error": str(e)}
    except Exception as e:
        print(f"Error updating row: {str(e)}")
        return {"success": False, "error": str(e)}

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
        
        # For development tables, just return success with a mock ID
        dev_tables = ["customers", "orders", "products"]
        if table_name in dev_tables:
            print(f"Mock insert for development table '{table_name}'")
            return {"success": True, "id": 999, "message": f"Row inserted successfully into table {table_name} (mock)"}
        
        # Check if the table exists in the database schema
        from sqlalchemy import inspect, text
        inspector = inspect(db.get_bind())
        db_table_names = inspector.get_table_names()
        
        if table_name not in db_table_names:
            return {"success": False, "error": f"Table '{table_name}' not found in database"}
        
        # Build the insert query
        columns = list(data.keys())
        placeholders = [f":{col}" for col in columns]
        
        if not columns:
            return {"success": False, "error": "No data provided"}
        
        query = f"INSERT INTO {table_name} ({', '.join(columns)}) OUTPUT INSERTED.id VALUES ({', '.join(placeholders)})"
        
        # Execute the query
        with engine.connect() as connection:
            try:
                result = connection.execute(text(query), data)
                connection.commit()
                # Try to get the inserted ID
                inserted_id = None
                try:
                    inserted_id = result.scalar()
                except:
                    pass
                
                return {
                    "success": True, 
                    "id": inserted_id, 
                    "message": f"Row inserted successfully into table {table_name}"
                }
            except Exception as e:
                connection.rollback()
                print(f"Error executing insert query: {str(e)}")
                return {"success": False, "error": str(e)}
    except Exception as e:
        print(f"Error inserting row: {str(e)}")
        return {"success": False, "error": str(e)}

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
        
        # For development tables, just return success
        dev_tables = ["customers", "orders", "products"]
        if table_name in dev_tables:
            print(f"Mock delete for development table '{table_name}'")
            return {"success": True, "message": f"Row {row_id} deleted successfully from table {table_name} (mock)"}
        
        # Check if the table exists in the database schema
        from sqlalchemy import inspect, text
        inspector = inspect(db.get_bind())
        db_table_names = inspector.get_table_names()
        
        if table_name not in db_table_names:
            return {"success": False, "error": f"Table '{table_name}' not found in database"}
        
        # Build the delete query
        query = f"DELETE FROM {table_name} WHERE id = :row_id"
        
        # Execute the query
        with engine.connect() as connection:
            try:
                connection.execute(text(query), {"row_id": row_id})
                connection.commit()
                return {"success": True, "message": f"Row {row_id} deleted successfully from table {table_name}"}
            except Exception as e:
                connection.rollback()
                print(f"Error executing delete query: {str(e)}")
                return {"success": False, "error": str(e)}
    except Exception as e:
        print(f"Error deleting row: {str(e)}")
        return {"success": False, "error": str(e)}

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
        
        # Add mock tables for development
        dev_tables = [
            {"id": 101, "name": "customers", "description": "Customer information (dev)"},
            {"id": 102, "name": "orders", "description": "Order details (dev)"},
            {"id": 103, "name": "products", "description": "Product catalog (dev)"}
        ]
        
        # Add dev tables that don't exist in the database
        existing_names = [table["name"] for table in tables]
        for dev_table in dev_tables:
            if dev_table["name"] not in existing_names:
                tables.append(dev_table)
        
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
