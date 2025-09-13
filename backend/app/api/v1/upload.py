"""
File upload endpoints for PDF processing
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import os
import aiofiles
from pathlib import Path
import uuid
import logging
from typing import List

from ...core.config import settings
from ...schemas.upload import UploadResponse, FileValidationError
from ...services.file_manager import FileManagerService
from ...services.job_tracker import JobTrackerService
from ...services.websocket_manager import WebSocketManagerService
from ...integration.paper_coder_wrapper import Paper2CodeWrapper

router = APIRouter()

# Initialize services
file_manager = FileManagerService()
job_tracker = JobTrackerService()
websocket_manager = WebSocketManagerService()
paper_coder = Paper2CodeWrapper(websocket_manager)

async def process_paper_background(job_id: str, pdf_path: str, filename: str):
    """
    Background task to process paper through Paper2Code pipeline
    """
    try:
        logger = logging.getLogger(__name__)
        logger.info(f"Starting background processing for job {job_id}")
        
        # Convert PDF to JSON first
        json_path = await file_manager.convert_pdf_to_json(pdf_path)
        
        # Extract paper name from filename (remove .pdf extension)
        paper_name = filename.replace('.pdf', '').replace(' ', '_')
        
        # Process through Paper2Code pipeline
        repository_path = await paper_coder.process_paper(job_id, json_path, paper_name)
        
        logger.info(f"Background processing completed for job {job_id}: {repository_path}")
        
    except Exception as e:
        logger.error(f"Background processing failed for job {job_id}: {str(e)}")
        await job_tracker.fail_job(job_id, f"Processing failed: {str(e)}")
        await websocket_manager.send_job_error(job_id, str(e))

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
        background_tasks.add_task(process_paper_background, job_id, file_path, file.filename)
        
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