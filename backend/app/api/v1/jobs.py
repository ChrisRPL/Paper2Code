"""
Job management endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid

from ...schemas.job import JobResponse, JobListResponse, JobStatus
from ...services.job_tracker import JobTrackerService

router = APIRouter()

# Initialize service
job_tracker = JobTrackerService()

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
async def start_job(job_id: str):
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
        
        # Return download URL or file response
        # This would typically return a FileResponse or redirect to download URL
        return {
            "download_url": f"/api/v1/jobs/{job_id}/files",
            "repository_path": job.repository_path,
            "message": "Repository ready for download"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))