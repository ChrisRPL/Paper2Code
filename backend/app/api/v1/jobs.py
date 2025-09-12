"""
Job management endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List, Optional
import uuid
import logging
import zipfile
import tempfile
from pathlib import Path

from ...schemas.job import JobResponse, JobListResponse, JobStatus
from ...services.job_tracker import JobTrackerService
from ...services.websocket_manager import WebSocketManagerService
from ...services.file_manager import FileManagerService
from ...integration.paper_coder_wrapper import Paper2CodeWrapper

router = APIRouter()

# Initialize services
job_tracker = JobTrackerService()
websocket_manager = WebSocketManagerService()
file_manager = FileManagerService()
paper_coder = Paper2CodeWrapper(websocket_manager)

async def process_job_background(job_id: str, pdf_path: str, filename: str):
    """
    Background task to process job through Paper2Code pipeline
    """
    try:
        logger = logging.getLogger(__name__)
        logger.info(f"Starting job processing for {job_id}")
        
        # Convert PDF to JSON first
        json_path = await file_manager.convert_pdf_to_json(pdf_path)
        
        # Extract paper name from filename
        paper_name = filename.replace('.pdf', '').replace(' ', '_')
        
        # Process through Paper2Code pipeline
        repository_path = await paper_coder.process_paper(job_id, json_path, paper_name)
        
        logger.info(f"Job processing completed for {job_id}: {repository_path}")
        
    except Exception as e:
        logger.error(f"Job processing failed for {job_id}: {str(e)}")
        await job_tracker.fail_job(job_id, f"Processing failed: {str(e)}")
        await websocket_manager.send_job_error(job_id, str(e))

@router.get("/", response_model=JobListResponse)
async def list_jobs(
    status: Optional[JobStatus] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Get list of processing jobs
    """
    try:
        jobs = await job_tracker.get_jobs(
            status=status,
            limit=limit,
            offset=offset
        )
        return JobListResponse(jobs=jobs, total=len(jobs))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """
    Get details of a specific job
    """
    try:
        job = await job_tracker.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{job_id}/start")
async def start_job(job_id: str, background_tasks: BackgroundTasks):
    """
    Start processing a job manually
    """
    try:
        job = await job_tracker.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.status != JobStatus.PENDING:
            raise HTTPException(
                status_code=400, 
                detail=f"Job cannot be started. Current status: {job.status}"
            )
        
        # Start processing
        await job_tracker.start_job_processing(job_id)
        
        # Schedule background processing
        background_tasks.add_task(process_job_background, job_id, job.original_file_path, job.filename)
        
        return {"message": "Job processing started", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str):
    """
    Cancel a running job
    """
    try:
        result = await job_tracker.cancel_job(job_id)
        if not result:
            raise HTTPException(status_code=404, detail="Job not found or cannot be cancelled")
        
        return {"message": "Job cancelled successfully", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{job_id}/download")
async def download_job_result(job_id: str):
    """
    Download the generated repository for a completed job
    """
    try:
        job = await job_tracker.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.status != JobStatus.COMPLETED:
            raise HTTPException(
                status_code=400, 
                detail=f"Job not completed. Current status: {job.status}"
            )
        
        if not job.repository_path:
            raise HTTPException(status_code=404, detail="Repository not found")
        
        repository_path = Path(job.repository_path)
        if not repository_path.exists():
            raise HTTPException(status_code=404, detail="Repository directory not found")
        
        # Create a temporary zip file of the repository
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
            zip_path = tmp_file.name
        
        # Create zip file with all repository contents
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in repository_path.rglob('*'):
                if file_path.is_file():
                    # Add file to zip with relative path from repository root
                    arcname = file_path.relative_to(repository_path)
                    zipf.write(file_path, arcname)
        
        # Extract paper name for filename
        paper_name = repository_path.name.replace('_repo', '')
        filename = f"{paper_name}_repository.zip"
        
        return FileResponse(
            path=zip_path,
            filename=filename,
            media_type='application/zip'
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))