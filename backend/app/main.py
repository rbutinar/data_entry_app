from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from backend.app.auth.token import get_current_user
from backend.app.routers import tables, data, debug, settings
from backend.database.connection import Base


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

@app.get("/")
async def root():
    return {"message": "Welcome to the Data Entry API"}

@app.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user
