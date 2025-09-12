"""
Paper2Code Web Application Backend
FastAPI application for managing PDF uploads and Paper2Code processing
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from .core.config import settings
from .api.v1 import api_router

# Create FastAPI instance
app = FastAPI(
    title="Paper2Code API",
    description="Backend API for Paper2Code web application",
    version="0.1.0",
    openapi_url="/api/openapi.json" if settings.DEBUG else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api")

# Serve static files (uploaded PDFs, generated repositories)
if not settings.DEBUG:
    # Only serve static files in production with proper security
    static_path = Path(settings.UPLOAD_DIR).parent / "public"
    if static_path.exists():
        app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    # Create necessary directories
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    
    print(f"🚀 Paper2Code API starting in {settings.ENVIRONMENT} mode")
    print(f"📁 Upload directory: {settings.UPLOAD_DIR}")
    print(f"📁 Output directory: {settings.OUTPUT_DIR}")

@app.on_event("shutdown") 
async def shutdown_event():
    """Application shutdown event"""
    print("📴 Paper2Code API shutting down")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )