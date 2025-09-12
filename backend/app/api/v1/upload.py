"""
File upload endpoints for PDF processing
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import os
import aiofiles
from pathlib import Path
import uuid
from typing import List

from ...core.config import settings
from ...schemas.upload import UploadResponse, FileValidationError
from ...services.file_manager import FileManagerService
from ...services.job_tracker import JobTrackerService

router = APIRouter()

# Initialize services
file_manager = FileManagerService()
job_tracker = JobTrackerService()

@router.post("/", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload a PDF file for processing
    """
    try:
        # Validate file
        validation_result = await file_manager.validate_pdf_file(file)
        if not validation_result.is_valid:
            raise HTTPException(
                status_code=400, 
                detail=f"File validation failed: {validation_result.error}"
            )
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        
        # Save file to upload directory
        file_path = await file_manager.save_uploaded_file(file, file_id)
        
        # Create job entry
        job_id = await job_tracker.create_job(
            filename=file.filename,
            file_path=file_path,
            file_size=file.size
        )
        
        # Schedule background processing
        # background_tasks.add_task(process_paper_background, job_id, file_path)
        
        return UploadResponse(
            job_id=job_id,
            file_id=file_id,
            filename=file.filename,
            message="File uploaded successfully. Processing will begin shortly."
        )
        
    except Exception as e:
        # Clean up file if it was saved
        try:
            if 'file_path' in locals():
                os.remove(file_path)
        except:
            pass
            
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "formats": ["pdf"],
        "max_size_mb": settings.MAX_FILE_SIZE_MB,
        "description": "Currently only PDF files are supported for Paper2Code processing"
    }

@router.delete("/{file_id}")
async def delete_uploaded_file(file_id: str):
    """Delete an uploaded file"""
    try:
        await file_manager.delete_file(file_id)
        return {"message": "File deleted successfully"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")