"""API v1 routes"""

from fastapi import APIRouter

from .upload import router as upload_router
from .jobs import router as jobs_router  
from .websocket import router as websocket_router

# Create main API router
api_router = APIRouter(prefix="/v1")

# Include sub-routers
api_router.include_router(upload_router, prefix="/upload", tags=["upload"])
api_router.include_router(jobs_router, prefix="/jobs", tags=["jobs"])
api_router.include_router(websocket_router, prefix="/ws", tags=["websocket"])