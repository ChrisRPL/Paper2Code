"""
Unit tests for JobTrackerService
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch

from app.services.job_tracker import JobTrackerService
from app.models.job import JobStatus, ProcessingStage


@pytest.mark.unit
class TestJobTrackerService:
    """Test suite for JobTrackerService."""

    @pytest.mark.asyncio
    async def test_create_job(self, test_db_session, mock_job_tracker):
        """Test creating a new job."""
        # Arrange
        pdf_path = "/test/path/document.pdf"
        paper_name = "Test Paper"

        # Act
        job = await mock_job_tracker.create_job(pdf_path, paper_name)

        # Assert
        assert job is not None
        assert job.pdf_path == pdf_path
        assert job.paper_name == paper_name
        assert job.status == JobStatus.PENDING
        assert job.progress == 0
        assert job.current_stage is None

    @pytest.mark.asyncio
    async def test_get_job_by_id(self, test_db_session, mock_job_tracker):
        """Test retrieving a job by ID."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/path.pdf", "Test Paper")
        job_id = job.id

        # Act
        retrieved_job = await mock_job_tracker.get_job(job_id)

        # Assert
        assert retrieved_job is not None
        assert retrieved_job.id == job_id
        assert retrieved_job.paper_name == "Test Paper"

    @pytest.mark.asyncio
    async def test_get_nonexistent_job(self, test_db_session, mock_job_tracker):
        """Test retrieving a non-existent job returns None."""
        # Act
        job = await mock_job_tracker.get_job("nonexistent-id")

        # Assert
        assert job is None

    @pytest.mark.asyncio
    async def test_update_job_progress(self, test_db_session, mock_job_tracker):
        """Test updating job progress and stage."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/path.pdf", "Test Paper")
        job_id = job.id

        # Act
        updated_job = await mock_job_tracker.update_job_progress(
            job_id,
            ProcessingStage.PLANNING,
            50
        )

        # Assert
        assert updated_job is not None
        assert updated_job.current_stage == ProcessingStage.PLANNING
        assert updated_job.progress == 50
        assert updated_job.status == JobStatus.PROCESSING

    @pytest.mark.asyncio
    async def test_complete_job(self, test_db_session, mock_job_tracker):
        """Test marking a job as completed."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/path.pdf", "Test Paper")
        job_id = job.id
        repository_path = "/outputs/test_repo"
        processing_logs = ["Log 1", "Log 2"]

        # Act
        completed_job = await mock_job_tracker.complete_job(
            job_id,
            repository_path,
            processing_logs
        )

        # Assert
        assert completed_job is not None
        assert completed_job.status == JobStatus.COMPLETED
        assert completed_job.progress == 100
        assert completed_job.repository_path == repository_path
        assert completed_job.processing_logs == processing_logs
        assert completed_job.completed_at is not None

    @pytest.mark.asyncio
    async def test_fail_job(self, test_db_session, mock_job_tracker):
        """Test marking a job as failed."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/path.pdf", "Test Paper")
        job_id = job.id
        error_message = "Processing failed due to invalid PDF"

        # Act
        failed_job = await mock_job_tracker.fail_job(job_id, error_message)

        # Assert
        assert failed_job is not None
        assert failed_job.status == JobStatus.FAILED
        assert failed_job.error_message == error_message
        assert failed_job.completed_at is not None

    @pytest.mark.asyncio
    async def test_cancel_job(self, test_db_session, mock_job_tracker):
        """Test cancelling a job."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/path.pdf", "Test Paper")
        job_id = job.id

        # Start processing
        await mock_job_tracker.update_job_progress(
            job_id,
            ProcessingStage.PLANNING,
            25
        )

        # Act
        success = await mock_job_tracker.cancel_job(job_id)
        cancelled_job = await mock_job_tracker.get_job(job_id)

        # Assert
        assert success is True
        assert cancelled_job.status == JobStatus.CANCELLED

    @pytest.mark.asyncio
    async def test_cancel_completed_job_fails(self, test_db_session, mock_job_tracker):
        """Test that cancelling a completed job fails."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/path.pdf", "Test Paper")
        job_id = job.id
        await mock_job_tracker.complete_job(job_id, "/repo", [])

        # Act
        success = await mock_job_tracker.cancel_job(job_id)

        # Assert
        assert success is False

    @pytest.mark.asyncio
    async def test_get_all_jobs(self, test_db_session, mock_job_tracker):
        """Test retrieving all jobs."""
        # Arrange
        await mock_job_tracker.create_job("/test/path1.pdf", "Paper 1")
        await mock_job_tracker.create_job("/test/path2.pdf", "Paper 2")
        await mock_job_tracker.create_job("/test/path3.pdf", "Paper 3")

        # Act
        jobs = await mock_job_tracker.get_all_jobs()

        # Assert
        assert len(jobs) == 3
        assert all(job.paper_name in ["Paper 1", "Paper 2", "Paper 3"] for job in jobs)

    @pytest.mark.asyncio
    async def test_get_jobs_with_filters(self, test_db_session, mock_job_tracker):
        """Test retrieving jobs with status filter."""
        # Arrange
        job1 = await mock_job_tracker.create_job("/test/path1.pdf", "Paper 1")
        job2 = await mock_job_tracker.create_job("/test/path2.pdf", "Paper 2")
        job3 = await mock_job_tracker.create_job("/test/path3.pdf", "Paper 3")

        # Complete job1
        await mock_job_tracker.complete_job(job1.id, "/repo1", [])
        # Fail job2
        await mock_job_tracker.fail_job(job2.id, "Error")
        # Leave job3 as pending

        # Act
        completed_jobs = await mock_job_tracker.get_all_jobs(status=JobStatus.COMPLETED)
        failed_jobs = await mock_job_tracker.get_all_jobs(status=JobStatus.FAILED)
        pending_jobs = await mock_job_tracker.get_all_jobs(status=JobStatus.PENDING)

        # Assert
        assert len(completed_jobs) == 1
        assert completed_jobs[0].id == job1.id
        assert len(failed_jobs) == 1
        assert failed_jobs[0].id == job2.id
        assert len(pending_jobs) == 1
        assert pending_jobs[0].id == job3.id

    @pytest.mark.asyncio
    async def test_job_stage_progression(self, test_db_session, mock_job_tracker):
        """Test job progression through all stages."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/path.pdf", "Test Paper")
        job_id = job.id

        # Act & Assert - Progress through stages
        # Preprocessing
        job = await mock_job_tracker.update_job_progress(
            job_id, ProcessingStage.PREPROCESSING, 10
        )
        assert job.current_stage == ProcessingStage.PREPROCESSING
        assert job.progress == 10

        # Planning
        job = await mock_job_tracker.update_job_progress(
            job_id, ProcessingStage.PLANNING, 35
        )
        assert job.current_stage == ProcessingStage.PLANNING
        assert job.progress == 35

        # Analysis
        job = await mock_job_tracker.update_job_progress(
            job_id, ProcessingStage.ANALYSIS, 65
        )
        assert job.current_stage == ProcessingStage.ANALYSIS
        assert job.progress == 65

        # Coding
        job = await mock_job_tracker.update_job_progress(
            job_id, ProcessingStage.CODING, 90
        )
        assert job.current_stage == ProcessingStage.CODING
        assert job.progress == 90

        # Complete
        job = await mock_job_tracker.complete_job(job_id, "/repo", [])
        assert job.status == JobStatus.COMPLETED
        assert job.progress == 100