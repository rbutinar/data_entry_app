from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class DbSettings(BaseModel):
    tenant_id: str
    client_id: str
    client_secret: str
    endpoint: str
    database: str = ""
    port: str = "1433"

# In-memory override (module-level, not persistent)
override_settings = {}

from fastapi import Request

@router.post("/settings/db-credentials")
async def set_db_credentials(request: Request):
    body = await request.body()
    print("RAW BODY:", body)
    try:
        data = await request.json()
        print("PARSED JSON:", data)
    except Exception as e:
        print("JSON ERROR:", e)
        raise
    # Now validate and store settings
    required = ["tenant_id", "client_id", "client_secret", "endpoint", "database", "port"]
    for key in required:
        if key not in data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {key}")
    override_settings["AZURE_TENANT_ID"] = data["tenant_id"]
    override_settings["AZURE_CLIENT_ID"] = data["client_id"]
    override_settings["AZURE_CLIENT_SECRET"] = data["client_secret"]
    override_settings["SQL_SERVER_ENDPOINT"] = data["endpoint"]
    override_settings["SQL_DATABASE_NAME"] = data["database"]
    override_settings["SQL_SERVER_PORT"] = data["port"]
    # Dispose and reset the SQLAlchemy engine/session so new settings take effect
    try:
        from backend.database import connection
        if hasattr(connection, "_engine") and connection._engine is not None:
            connection._engine.dispose()
            connection._engine = None
            connection._SessionLocal = None
    except Exception as e:
        print("[DB-CONN] Warning: Could not dispose engine:", e)
    return {"status": "ok", "message": "Settings updated"}

@router.get("/settings/db-credentials")
def get_db_credentials():
    import os
    # Helper to determine value and source
    def get_setting(key_env, key_override, default=""):
        if key_override in override_settings:
            return {"value": override_settings[key_override], "source": "override"}
        env_val = os.getenv(key_env, default)
        return {"value": env_val, "source": "env" if env_val else "default"}

    return {
        "tenant_id": get_setting("AZURE_TENANT_ID", "AZURE_TENANT_ID"),
        "client_id": get_setting("AZURE_CLIENT_ID", "AZURE_CLIENT_ID"),
        "client_secret": get_setting("AZURE_CLIENT_SECRET", "AZURE_CLIENT_SECRET"),
        "endpoint": get_setting("SQL_SERVER_ENDPOINT", "SQL_SERVER_ENDPOINT"),
        "database": get_setting("SQL_DATABASE_NAME", "SQL_DATABASE_NAME"),
        "port": get_setting("SQL_SERVER_PORT", "SQL_SERVER_PORT", "1433"),
    }
