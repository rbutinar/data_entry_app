from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from backend.database.connection import get_db, get_engine
from backend.models.models import User, Table, UserTableAccess
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
import pyodbc

router = APIRouter()

def is_identity_column(connection, table_name, column_name):
    """
    Check if a column is an identity (auto-incrementing) column in SQL Server.
    """
    try:
        cursor = connection.connection.cursor()
        # This SQL query checks if a column has the IDENTITY property
        query = """
        SELECT 
            COLUMNPROPERTY(OBJECT_ID(?), ?, 'IsIdentity') AS is_identity
        """
        cursor.execute(query, (table_name, column_name))
        row = cursor.fetchone()
        if row and row[0] == 1:
            return True
        return False
    except Exception as e:
        print(f"Error checking identity column: {e}")
        return False

        
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
        inspector = inspect(get_engine())
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
