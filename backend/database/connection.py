import os
import pyodbc
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Import override_settings if present
try:
    from backend.app.routers.settings import override_settings
except ImportError:
    override_settings = {}

# Load environment variables
load_dotenv()

# Helper to get config with override
get_env = lambda key, default=None: override_settings.get(key) or os.getenv(key, default)


from fastapi import HTTPException

Base = declarative_base()
metadata = MetaData()

_engine = None
_SessionLocal = None

REQUIRED_SETTINGS = ["SQL_SERVER_ENDPOINT", "AZURE_TENANT_ID", "AZURE_CLIENT_SECRET"]

def settings_ready():
    return all(get_env(k) for k in REQUIRED_SETTINGS)

def normalize_bool(val):
    if str(val).lower() in ["true", "1", "yes"]:
        return "yes"
    return "no"

def get_engine():
    global _engine, _SessionLocal
    if not settings_ready():
        raise HTTPException(status_code=503, detail="Database settings not configured. Please set SQL_SERVER_ENDPOINT, AZURE_TENANT_ID, and AZURE_CLIENT_SECRET.")
    if _engine is None:
        server = get_env('SQL_SERVER_ENDPOINT')
        port = get_env('SQL_SERVER_PORT') or '1433'
        database = get_env('SQL_DATABASE_NAME') or ''
        client_id = get_env('AZURE_CLIENT_ID') or ''
        tenant_id = get_env('AZURE_TENANT_ID') or ''
        client_secret = get_env('AZURE_CLIENT_SECRET') or ''
        encrypt = normalize_bool(get_env('SQL_ENCRYPT', 'yes'))
        trust_cert = normalize_bool(get_env('SQL_TRUST_CERTIFICATE', 'no'))
        timeout = get_env('SQL_TIMEOUT', '30')
        conn_str = (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server={server},{port};"
            f"Database={database};"
            f"UID={client_id}@{tenant_id};"
            f"PWD=***;"  # Masked in log
            f"Authentication=ActiveDirectoryServicePrincipal;"
            f"Encrypt={encrypt};"
            f"TrustServerCertificate={trust_cert};"
            f"Connection Timeout={timeout};"
        )
        print("[DB-CONN] Connection string (masked):", conn_str.replace('PWD=***;', 'PWD=***;'))
        # Build the real connection string for SQLAlchemy
        real_conn_str = (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server={server},{port};"
            f"Database={database};"
            f"UID={client_id}@{tenant_id};"
            f"PWD={client_secret};"
            f"Authentication=ActiveDirectoryServicePrincipal;"
            f"Encrypt={encrypt};"
            f"TrustServerCertificate={trust_cert};"
            f"Connection Timeout={timeout};"
        )
        _engine = create_engine(f"mssql+pyodbc:///?odbc_connect={real_conn_str}")
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine

def get_db():
    if not settings_ready():
        raise HTTPException(status_code=503, detail="Database settings not configured. Please set SQL_SERVER_ENDPOINT, AZURE_TENANT_ID, and AZURE_CLIENT_SECRET.")
    get_engine()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
