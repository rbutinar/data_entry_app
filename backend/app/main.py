from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.auth.token import get_current_user
from backend.app.routers import tables, data, debug, settings
from backend.database.connection import Base
import os


app = FastAPI(title="Data Entry API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tables.router, prefix="/tables", tags=["tables"])
app.include_router(data.router, prefix="/data", tags=["data"])
app.include_router(debug.router, prefix="/debug", tags=["debug"])
app.include_router(settings.router, tags=["settings"])

# Serve static files from React build
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "build")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=os.path.join(static_dir, "static")), name="static")

@app.get("/")
async def root():
    # Serve React app index.html for root path
    if os.path.exists(static_dir):
        return FileResponse(os.path.join(static_dir, "index.html"))
    return {"message": "Welcome to the Data Entry API"}

# Catch-all route for React Router (SPA)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # Don't serve React app for API paths
    if full_path.startswith(("api/", "tables/", "data/", "debug/", "settings/", "me")):
        raise HTTPException(404, "Not found")
    
    # Serve static files directly (manifest.json, favicon.ico, etc.)
    if "." in full_path and os.path.exists(static_dir):
        static_file = os.path.join(static_dir, full_path)
        if os.path.exists(static_file):
            return FileResponse(static_file)
    
    # Serve React app for all other paths
    if os.path.exists(static_dir):
        return FileResponse(os.path.join(static_dir, "index.html"))
    raise HTTPException(404, "Frontend not built")

@app.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user
