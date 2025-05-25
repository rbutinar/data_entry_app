import os
import pyodbc
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database connection details from environment variables
SERVER = os.getenv("SQL_SERVER_ENDPOINT")
PORT = os.getenv("SQL_SERVER_PORT")
DATABASE = os.getenv("SQL_DATABASE_NAME")
CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
ENCRYPT = os.getenv("SQL_ENCRYPT", "yes")
TRUST_SERVER_CERTIFICATE = os.getenv("SQL_TRUST_CERTIFICATE", "no")
TIMEOUT = int(os.getenv("SQL_TIMEOUT", "30"))

# Create connection string for Azure SQL with Service Principal authentication
conn_str = (
    f"Driver={{ODBC Driver 18 for SQL Server}};"
    f"Server={SERVER},{PORT};"
    f"Database={DATABASE};"
    f"UID={CLIENT_ID}@{TENANT_ID};"
    f"PWD={CLIENT_SECRET};"
    f"Authentication=ActiveDirectoryServicePrincipal;"
    f"Encrypt=yes;"
    f"TrustServerCertificate=no;"
    f"Connection Timeout={TIMEOUT};"
)

# Create SQLAlchemy engine
engine = create_engine(f"mssql+pyodbc:///?odbc_connect={conn_str}")

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()
metadata = MetaData()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
