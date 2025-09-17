"""
Job tracking service for managing Paper2Code processing jobs
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import logging
import json

from ..core.database import get_db
from ..models.job import Job, JobStatus, ProcessingStage
from ..schemas.job import JobCreateRequest, JobUpdateRequest, JobResponse

logger = logging.getLogger(__name__)

class JobTrackerService:
    """Service for managing job lifecycle and database operations"""
    
    def __init__(self):
        pass
    
    async def create_job(
        self, 
        filename: str, 
        file_path: str, 
        file_size: Optional[int] = None
    ) -> str:
        """
        Create a new processing job
        """
        try:
            from ..core.database import async_session_factory
            
            async with async_session_factory() as session:
                # Create new job instance
                job = Job(
                    filename=filename,
                    original_file_path=file_path,
                    file_size=file_size,
                    status=JobStatus.PENDING,
                    stage=ProcessingStage.PREPROCESSING,
                    progress=0
                )
                
                session.add(job)
                await session.commit()
                await session.refresh(job)
                
                logger.info(f"Created new job: {job.id} for file: {filename}")
                return job.id
                
        except Exception as e:
            logger.error(f"Error creating job: {e}")
            raise Exception(f"Failed to create job: {str(e)}")
    
    async def get_job(self, job_id: str) -> Optional[JobResponse]:
        """
        Get job details by ID
        """
        try:
            from ..core.database import async_session_factory
            
            async with async_session_factory() as session:
                result = await session.execute(
                    select(Job).where(Job.id == job_id)
                )
                job = result.scalar_one_or_none()
                
                if job:
                    return JobResponse.from_orm(job)
                return None
                
        except Exception as e:
            logger.error(f"Error getting job {job_id}: {e}")
            return None
    
    async def get_jobs(
        self, 
        status: Optional[JobStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[JobResponse]:
        """
        Get list of jobs with optional filtering
        """
        try:
            from ..core.database import async_session_factory
            
            async with async_session_factory() as session:
                query = select(Job).order_by(desc(Job.created_at))
                
                # Apply status filter if provided
                if status:
                    query = query.where(Job.status == status)
                
                # Apply pagination
                query = query.offset(offset).limit(limit)
                
                result = await session.execute(query)
                jobs = result.scalars().all()
                
                return [JobResponse.from_orm(job) for job in jobs]
                
        except Exception as e:
            logger.error(f"Error getting jobs: {e}")
            return []
    
    async def update_job(self, job_id: str, updates: JobUpdateRequest) -> bool:
        """
        Update job with new information
        """
        try:
            from ..core.database import async_session_factory
            
            async with async_session_factory() as session:
                # Prepare update data
                update_data = {}
                if updates.status is not None:
                    update_data['status'] = updates.status
                if updates.stage is not None:
                    update_data['stage'] = updates.stage
                if updates.progress is not None:
                    update_data['progress'] = updates.progress
                if updates.error_message is not None:
                    update_data['error_message'] = updates.error_message
                if updates.repository_path is not None:
                    update_data['repository_path'] = updates.repository_path
                
                # Add timestamps based on status
                if updates.status == JobStatus.PROCESSING:
                    update_data['started_at'] = datetime.utcnow()
                elif updates.status in [JobStatus.COMPLETED, JobStatus.ERROR]:
                    update_data['completed_at'] = datetime.utcnow()
                
                # Always update the updated_at timestamp
                update_data['updated_at'] = datetime.utcnow()
                
                # Execute update
                await session.execute(
                    update(Job)
                    .where(Job.id == job_id)
                    .values(**update_data)
                )
                await session.commit()
                
                logger.info(f"Updated job {job_id} with: {update_data}")
                return True
                
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {e}")
            return False
    
    async def update_job_progress(
        self, 
        job_id: str, 
        stage: ProcessingStage,
        progress: int,
        message: Optional[str] = None
    ) -> bool:
        """
        Update job progress during processing
        """
        try:
            updates = JobUpdateRequest(
                stage=stage,
                progress=progress,
                status=JobStatus.PROCESSING if progress < 100 else JobStatus.COMPLETED
            )
            
            success = await self.update_job(job_id, updates)
            
            if success and message:
                await self.add_job_log(job_id, message, stage.value)
            
            return success
            
        except Exception as e:
            logger.error(f"Error updating job progress {job_id}: {e}")
            return False
    
    async def start_job_processing(self, job_id: str) -> bool:
        """
        Mark job as started and ready for processing
        """
        try:
            updates = JobUpdateRequest(
                status=JobStatus.PROCESSING,
                stage=ProcessingStage.PREPROCESSING,
                progress=0
            )
            
            return await self.update_job(job_id, updates)
            
        except Exception as e:
            logger.error(f"Error starting job processing {job_id}: {e}")
            return False
    
    async def complete_job(
        self, 
        job_id: str, 
        repository_path: str,
        processing_logs: Optional[List[str]] = None
    ) -> bool:
        """
        Mark job as completed with results
        """
        try:
            # Prepare log data
            log_data = json.dumps(processing_logs) if processing_logs else None
            
            from ..core.database import async_session_factory
            
            async with async_session_factory() as session:
                await session.execute(
                    update(Job)
                    .where(Job.id == job_id)
                    .values(
                        status=JobStatus.COMPLETED,
                        stage=ProcessingStage.POSTPROCESSING,
                        progress=100,
                        repository_path=repository_path,
                        processing_logs=log_data,
                        completed_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                )
                await session.commit()
                
                logger.info(f"Job {job_id} completed with repository: {repository_path}")
                return True
                
        except Exception as e:
            logger.error(f"Error completing job {job_id}: {e}")
            return False
    
    async def fail_job(self, job_id: str, error_message: str) -> bool:
        """
        Mark job as failed with error message
        """
        try:
            updates = JobUpdateRequest(
                status=JobStatus.ERROR,
                error_message=error_message
            )
            
            return await self.update_job(job_id, updates)
            
        except Exception as e:
            logger.error(f"Error failing job {job_id}: {e}")
            return False

    async def reset_for_retry(self, job_id: str) -> bool:
        """
        Reset a failed job to pending for retry and increment retry_count
        """
        try:
            from ..core.database import async_session_factory
            async with async_session_factory() as session:
                await session.execute(
                    update(Job)
                    .where(Job.id == job_id)
                    .values(
                        status=JobStatus.PENDING,
                        stage=ProcessingStage.PREPROCESSING,
                        progress=0,
                        error_message=None,
                        started_at=None,
                        completed_at=None,
                        retry_count=Job.retry_count + 1,  # type: ignore
                        updated_at=datetime.utcnow(),
                    )
                )
                await session.commit()
                return True
        except Exception as e:
            logger.error(f"Error resetting job {job_id} for retry: {e}")
            return False

    async def get_job_logs(self, job_id: str) -> list[dict]:
        """
        Retrieve parsed processing logs for a job
        """
        try:
            from ..core.database import async_session_factory
            import json
            async with async_session_factory() as session:
                result = await session.execute(select(Job).where(Job.id == job_id))
                job = result.scalar_one_or_none()
                if not job or not job.processing_logs:
                    return []
                try:
                    return json.loads(job.processing_logs)
                except Exception:
                    return []
        except Exception as e:
            logger.error(f"Error getting logs for job {job_id}: {e}")
            return []

    async def get_statistics(self) -> dict:
        """
        Aggregate counts of jobs by status
        """
        try:
            from ..core.database import async_session_factory
            async with async_session_factory() as session:
                result = await session.execute(select(Job))
                jobs = result.scalars().all()
                total = len(jobs)
                by_status = {s.value: 0 for s in JobStatus}
                for j in jobs:
                    by_status[j.status.value] = by_status.get(j.status.value, 0) + 1
                return {
                    "total_jobs": total,
                    "jobs_by_status": by_status,
                }
        except Exception as e:
            logger.error(f"Error computing job statistics: {e}")
            return {"total_jobs": 0, "jobs_by_status": {s.value: 0 for s in JobStatus}}
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a job (if it's not already completed)
        """
        try:
            from ..core.database import async_session_factory
            
            async with async_session_factory() as session:
                # Check if job can be cancelled
                result = await session.execute(
                    select(Job).where(Job.id == job_id)
                )
                job = result.scalar_one_or_none()
                
                if not job:
                    return False
                
                if job.status in [JobStatus.COMPLETED, JobStatus.ERROR]:
                    logger.warning(f"Cannot cancel job {job_id}: already {job.status}")
                    return False
                
                # Cancel the job
                await session.execute(
                    update(Job)
                    .where(Job.id == job_id)
                    .values(
                        status=JobStatus.ERROR,
                        error_message="Job cancelled by user",
                        completed_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                )
                await session.commit()
                
                logger.info(f"Job {job_id} cancelled successfully")
                return True
                
        except Exception as e:
            logger.error(f"Error cancelling job {job_id}: {e}")
            return False
    
    async def add_job_log(
        self, 
        job_id: str, 
        message: str, 
        stage: Optional[str] = None
    ) -> bool:
        """
        Add a log entry to job processing logs
        """
        try:
            from ..core.database import async_session_factory
            
            async with async_session_factory() as session:
                # Get current job
                result = await session.execute(
                    select(Job).where(Job.id == job_id)
                )
                job = result.scalar_one_or_none()
                
                if not job:
                    return False
                
                # Parse existing logs
                current_logs = []
                if job.processing_logs:
                    try:
                        current_logs = json.loads(job.processing_logs)
                    except json.JSONDecodeError:
                        current_logs = []
                
                # Add new log entry
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "message": message,
                    "stage": stage
                }
                current_logs.append(log_entry)
                
                # Update job with new logs
                await session.execute(
                    update(Job)
                    .where(Job.id == job_id)
                    .values(
                        processing_logs=json.dumps(current_logs),
                        updated_at=datetime.utcnow()
                    )
                )
                await session.commit()
                
                return True
                
        except Exception as e:
            logger.error(f"Error adding job log {job_id}: {e}")
            return False
    
    async def get_active_jobs(self) -> List[JobResponse]:
        """
        Get list of currently active (processing) jobs
        """
        return await self.get_jobs(status=JobStatus.PROCESSING)
    
    async def cleanup_old_jobs(self, days_old: int = 7) -> int:
        """
        Clean up old completed jobs (for maintenance)
        """
        try:
            from ..core.database import async_session_factory
            from datetime import timedelta
            
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            async with async_session_factory() as session:
                # Get jobs to delete
                result = await session.execute(
                    select(Job).where(
                        and_(
                            Job.status.in_([JobStatus.COMPLETED, JobStatus.ERROR]),
                            Job.completed_at < cutoff_date
                        )
                    )
                )
                jobs_to_delete = result.scalars().all()
                
                # Delete old jobs
                deleted_count = 0
                for job in jobs_to_delete:
                    await session.delete(job)
                    deleted_count += 1
                
                await session.commit()
                
                logger.info(f"Cleaned up {deleted_count} old jobs")
                return deleted_count
                
        except Exception as e:
            logger.error(f"Error cleaning up old jobs: {e}")
            return 0