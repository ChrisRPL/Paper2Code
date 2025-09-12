"""
Configuration settings for Paper2Code Web Application
"""

from pydantic_settings import BaseSettings
from pydantic import validator
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """Application settings"""
    
    # FastAPI Configuration
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    HOST: str = "localhost"
    PORT: int = 8000
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Database Configuration
    DATABASE_URL: str = "sqlite+aiosqlite:///./database.db"
    
    # File Storage Configuration
    UPLOAD_DIR: str = "../storage/uploads"
    OUTPUT_DIR: str = "../storage/outputs" 
    TEMP_DIR: str = "../storage/temp"
    MAX_FILE_SIZE_MB: int = 50
    
    @validator("UPLOAD_DIR", "OUTPUT_DIR", "TEMP_DIR", pre=True)
    def resolve_directory_paths(cls, v):
        """Resolve relative paths to absolute paths"""
        if not os.path.isabs(v):
            # Resolve relative to backend directory
            backend_dir = Path(__file__).parent.parent.parent
            return str(backend_dir / v)
        return v
    
    # Paper2Code Integration
    PAPER_CODER_CODES_DIR: str = "../codes"
    PAPER_CODER_SCRIPTS_DIR: str = "../scripts"  
    PAPER_CODER_OUTPUT_BASE_DIR: str = "../outputs"
    
    @validator("PAPER_CODER_CODES_DIR", "PAPER_CODER_SCRIPTS_DIR", "PAPER_CODER_OUTPUT_BASE_DIR", pre=True)
    def resolve_paper_coder_paths(cls, v):
        """Resolve Paper2Code paths"""
        if not os.path.isabs(v):
            backend_dir = Path(__file__).parent.parent.parent
            return str(backend_dir / v)
        return v
    
    # API Keys
    OPENAI_API_KEY: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create global settings instance
settings = Settings()

# Validate required directories exist or can be created
def validate_directories():
    """Ensure all required directories exist"""
    dirs_to_create = [
        settings.UPLOAD_DIR,
        settings.OUTPUT_DIR,
        settings.TEMP_DIR,
    ]
    
    for dir_path in dirs_to_create:
        os.makedirs(dir_path, exist_ok=True)
        
    # Validate Paper2Code directories exist
    paper_coder_dirs = [
        settings.PAPER_CODER_CODES_DIR,
        settings.PAPER_CODER_SCRIPTS_DIR,
    ]
    
    for dir_path in paper_coder_dirs:
        if not os.path.exists(dir_path):
            print(f"⚠️  Warning: Paper2Code directory not found: {dir_path}")

# Validate on import
validate_directories()