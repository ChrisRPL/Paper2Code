"""
Job model for tracking Paper2Code processing jobs
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, Enum as SQLAEnum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from datetime import datetime

from ..core.database import Base

class JobStatus(str, enum.Enum):
    """Job processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

class ProcessingStage(str, enum.Enum):
    """Paper2Code processing stages"""
    PREPROCESSING = "preprocessing"  # PDF to JSON conversion
    PLANNING = "planning"            # Stage 1: Planning agent
    ANALYSIS = "analysis"            # Stage 2: Analysis agent  
    CODING = "coding"                # Stage 3: Coding agent
    POSTPROCESSING = "postprocessing"  # Final cleanup and packaging

class Job(Base):
    """
    Job model for tracking Paper2Code paper processing
    """
    __tablename__ = "jobs"
    
    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # File information
    filename = Column(String, nullable=False)
    original_file_path = Column(String, nullable=False)
    pdf_json_path = Column(String, nullable=True)  # After s2orc conversion
    file_size = Column(Integer, nullable=True)
    
    # Processing status
    status = Column(SQLAEnum(JobStatus), default=JobStatus.PENDING, nullable=False)
    stage = Column(SQLAEnum(ProcessingStage), default=ProcessingStage.PREPROCESSING, nullable=True)
    progress = Column(Integer, default=0)  # 0-100
    
    # Results and outputs
    repository_path = Column(String, nullable=True)  # Final generated repository
    artifacts_path = Column(String, nullable=True)   # Intermediate processing artifacts
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Processing metadata
    processing_logs = Column(Text, nullable=True)  # JSON string of processing logs
    estimated_duration = Column(Integer, nullable=True)  # Estimated processing time in seconds
    
    def __repr__(self):
        return f"<Job(id={self.id}, filename={self.filename}, status={self.status})>"
    
    @property
    def is_completed(self) -> bool:
        """Check if job processing is completed"""
        return self.status in [JobStatus.COMPLETED, JobStatus.ERROR]
    
    @property
    def is_processing(self) -> bool:
        """Check if job is currently being processed"""
        return self.status == JobStatus.PROCESSING
    
    @property
    def duration(self) -> int | None:
        """Get processing duration in seconds"""
        if self.started_at and self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds())
        return None