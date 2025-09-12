"""
Upload-related Pydantic schemas
"""

from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime

class FileValidationError(BaseModel):
    """File validation error response"""
    is_valid: bool = False
    error: str
    details: Optional[dict] = None

class FileValidationResult(BaseModel):
    """File validation result"""
    is_valid: bool
    error: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    
class UploadResponse(BaseModel):
    """Response for successful file upload"""
    job_id: str
    file_id: str
    filename: str
    message: str
    file_size: Optional[int] = None
    estimated_processing_time: Optional[int] = None  # in seconds
    
class UploadRequest(BaseModel):
    """Upload request metadata (for future use)"""
    filename: str
    file_size: int
    content_type: str
    
    @validator('file_size')
    def validate_file_size(cls, v):
        # Max 50MB as configured in settings
        max_size = 50 * 1024 * 1024  # 50MB in bytes
        if v > max_size:
            raise ValueError(f'File size {v} bytes exceeds maximum allowed size of {max_size} bytes')
        return v
    
    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = ['application/pdf']
        if v not in allowed_types:
            raise ValueError(f'Content type {v} not allowed. Allowed types: {allowed_types}')
        return v

class SupportedFormatsResponse(BaseModel):
    """Response for supported file formats"""
    formats: List[str]
    max_size_mb: int
    description: str