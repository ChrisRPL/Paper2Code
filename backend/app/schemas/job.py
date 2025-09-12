"""
Job-related Pydantic schemas
"""

from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

from ..models.job import JobStatus, ProcessingStage

class JobResponse(BaseModel):
    """Response model for job details"""
    id: str
    filename: str
    status: JobStatus
    stage: Optional[ProcessingStage] = None
    progress: int
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    repository_path: Optional[str] = None
    error_message: Optional[str] = None
    duration: Optional[int] = None  # Processing duration in seconds
    estimated_duration: Optional[int] = None
    
    class Config:
        orm_mode = True  # For SQLAlchemy model compatibility

class JobListResponse(BaseModel):
    """Response model for job listing"""
    jobs: List[JobResponse]
    total: int
    limit: Optional[int] = None
    offset: Optional[int] = None

class JobCreateRequest(BaseModel):
    """Request model for job creation (internal use)"""
    filename: str
    file_path: str
    file_size: Optional[int] = None
    
class JobUpdateRequest(BaseModel):
    """Request model for job updates"""
    status: Optional[JobStatus] = None
    stage: Optional[ProcessingStage] = None  
    progress: Optional[int] = None
    error_message: Optional[str] = None
    repository_path: Optional[str] = None
    
    @validator('progress')
    def validate_progress(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Progress must be between 0 and 100')
        return v

class JobProgressUpdate(BaseModel):
    """WebSocket message for job progress updates"""
    job_id: str
    status: JobStatus
    stage: Optional[ProcessingStage] = None
    progress: int
    message: Optional[str] = None
    timestamp: datetime

class JobStartResponse(BaseModel):
    """Response for job start request"""
    message: str
    job_id: str
    estimated_duration: Optional[int] = None

class JobCancelResponse(BaseModel):
    """Response for job cancellation"""
    message: str
    job_id: str
    
class DownloadResponse(BaseModel):
    """Response for download request"""
    download_url: str
    repository_path: str
    message: str
    file_size: Optional[int] = None