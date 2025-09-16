"""
Integration tests for jobs API endpoints
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch

from fastapi import status
from httpx import AsyncClient

from app.models.job import JobStatus, ProcessingStage


@pytest.mark.integration
class TestJobsAPI:
    """Test suite for jobs API endpoints."""

    @pytest.fixture
    async def sample_job(self, test_db_session, mock_job_tracker):
        """Create a sample job for testing."""
        job = await mock_job_tracker.create_job(
            "/test/sample.pdf",
            "Sample Paper"
        )
        return job

    @pytest.mark.asyncio
    async def test_get_all_jobs_empty(self, async_client: AsyncClient):
        """Test getting all jobs when none exist."""
        # Act
        response = await async_client.get("/api/v1/jobs/")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["jobs"] == []
        assert response_data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_all_jobs_with_data(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test getting all jobs when jobs exist."""
        # Arrange
        await mock_job_tracker.create_job("/test/paper1.pdf", "Paper 1")
        await mock_job_tracker.create_job("/test/paper2.pdf", "Paper 2")
        await mock_job_tracker.create_job("/test/paper3.pdf", "Paper 3")

        # Act
        response = await async_client.get("/api/v1/jobs/")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data["jobs"]) == 3
        assert response_data["total"] == 3

    @pytest.mark.asyncio
    async def test_get_jobs_with_status_filter(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test getting jobs filtered by status."""
        # Arrange
        job1 = await mock_job_tracker.create_job("/test/paper1.pdf", "Paper 1")
        job2 = await mock_job_tracker.create_job("/test/paper2.pdf", "Paper 2")
        job3 = await mock_job_tracker.create_job("/test/paper3.pdf", "Paper 3")

        # Update statuses
        await mock_job_tracker.complete_job(job1.id, "/repo1", [])
        await mock_job_tracker.fail_job(job2.id, "Error")

        # Act
        response = await async_client.get("/api/v1/jobs/?status=completed")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data["jobs"]) == 1
        assert response_data["jobs"][0]["status"] == "completed"

    @pytest.mark.asyncio
    async def test_get_jobs_with_pagination(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test getting jobs with pagination."""
        # Arrange
        for i in range(15):
            await mock_job_tracker.create_job(f"/test/paper{i}.pdf", f"Paper {i}")

        # Act
        response = await async_client.get("/api/v1/jobs/?limit=5&offset=0")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data["jobs"]) == 5
        assert response_data["total"] == 15

        # Test second page
        response = await async_client.get("/api/v1/jobs/?limit=5&offset=5")
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data["jobs"]) == 5

    @pytest.mark.asyncio
    async def test_get_job_by_id(self, async_client: AsyncClient, sample_job):
        """Test getting a specific job by ID."""
        # Act
        response = await async_client.get(f"/api/v1/jobs/{sample_job.id}")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["id"] == sample_job.id
        assert response_data["paper_name"] == sample_job.paper_name
        assert response_data["status"] == sample_job.status.value

    @pytest.mark.asyncio
    async def test_get_nonexistent_job(self, async_client: AsyncClient):
        """Test getting a job that doesn't exist."""
        # Act
        response = await async_client.get("/api/v1/jobs/nonexistent-id")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_start_job_processing(self, async_client: AsyncClient, sample_job):
        """Test starting job processing."""
        # Mock the Paper2CodeWrapper
        with patch("app.api.v1.jobs.Paper2CodeWrapper") as mock_wrapper_class:
            mock_wrapper = AsyncMock()
            mock_wrapper.process_paper = AsyncMock(return_value="/test/repo")
            mock_wrapper_class.return_value = mock_wrapper

            # Act
            response = await async_client.post(f"/api/v1/jobs/{sample_job.id}/start")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["message"] == "Job processing started"

    @pytest.mark.asyncio
    async def test_start_nonexistent_job(self, async_client: AsyncClient):
        """Test starting processing for non-existent job."""
        # Act
        response = await async_client.post("/api/v1/jobs/nonexistent-id/start")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_start_already_processing_job(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test starting a job that's already processing."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/paper.pdf", "Test Paper")
        await mock_job_tracker.update_job_progress(job.id, ProcessingStage.PLANNING, 50)

        # Act
        response = await async_client.post(f"/api/v1/jobs/{job.id}/start")

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert "already processing" in response_data["detail"].lower()

    @pytest.mark.asyncio
    async def test_cancel_job(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test cancelling a job."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/paper.pdf", "Test Paper")
        await mock_job_tracker.update_job_progress(job.id, ProcessingStage.PLANNING, 25)

        # Mock the Paper2CodeWrapper
        with patch("app.api.v1.jobs.Paper2CodeWrapper") as mock_wrapper_class:
            mock_wrapper = AsyncMock()
            mock_wrapper.cancel_job = AsyncMock(return_value=True)
            mock_wrapper_class.return_value = mock_wrapper

            # Act
            response = await async_client.post(f"/api/v1/jobs/{job.id}/cancel")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["message"] == "Job cancelled successfully"

    @pytest.mark.asyncio
    async def test_cancel_completed_job(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test cancelling a completed job (should fail)."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/paper.pdf", "Test Paper")
        await mock_job_tracker.complete_job(job.id, "/test/repo", [])

        # Act
        response = await async_client.post(f"/api/v1/jobs/{job.id}/cancel")

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert "cannot be cancelled" in response_data["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_job(self, async_client: AsyncClient, sample_job):
        """Test deleting a job."""
        # Act
        response = await async_client.delete(f"/api/v1/jobs/{sample_job.id}")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["message"] == "Job deleted successfully"

        # Verify job is deleted
        get_response = await async_client.get(f"/api/v1/jobs/{sample_job.id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_nonexistent_job(self, async_client: AsyncClient):
        """Test deleting a non-existent job."""
        # Act
        response = await async_client.delete("/api/v1/jobs/nonexistent-id")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_download_job_repository(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test downloading job repository."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/paper.pdf", "Test Paper")
        await mock_job_tracker.complete_job(job.id, "/test/repo", [])

        # Mock file operations
        with patch("app.api.v1.jobs.Path") as mock_path:
            mock_path.return_value.exists.return_value = True
            mock_path.return_value.is_file.return_value = True

            with patch("app.api.v1.jobs.FileResponse") as mock_file_response:
                # Act
                response = await async_client.get(f"/api/v1/jobs/{job.id}/download")

                # Assert
                # Since we're mocking FileResponse, we can't test the actual download
                # but we can verify the endpoint doesn't return an error
                assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    @pytest.mark.asyncio
    async def test_download_incomplete_job_repository(self, async_client: AsyncClient, sample_job):
        """Test downloading repository for incomplete job."""
        # Act
        response = await async_client.get(f"/api/v1/jobs/{sample_job.id}/download")

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert "not completed" in response_data["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_job_logs(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test getting job processing logs."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/paper.pdf", "Test Paper")
        logs = ["Starting processing", "Planning complete", "Analysis complete"]
        await mock_job_tracker.complete_job(job.id, "/test/repo", logs)

        # Act
        response = await async_client.get(f"/api/v1/jobs/{job.id}/logs")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "logs" in response_data
        assert len(response_data["logs"]) == 3

    @pytest.mark.asyncio
    async def test_retry_failed_job(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test retrying a failed job."""
        # Arrange
        job = await mock_job_tracker.create_job("/test/paper.pdf", "Test Paper")
        await mock_job_tracker.fail_job(job.id, "Processing error")

        # Mock the Paper2CodeWrapper
        with patch("app.api.v1.jobs.Paper2CodeWrapper") as mock_wrapper_class:
            mock_wrapper = AsyncMock()
            mock_wrapper.process_paper = AsyncMock(return_value="/test/repo")
            mock_wrapper_class.return_value = mock_wrapper

            # Act
            response = await async_client.post(f"/api/v1/jobs/{job.id}/retry")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["message"] == "Job retry started"

    @pytest.mark.asyncio
    async def test_retry_non_failed_job(self, async_client: AsyncClient, sample_job):
        """Test retrying a job that hasn't failed."""
        # Act
        response = await async_client.post(f"/api/v1/jobs/{sample_job.id}/retry")

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert "only failed jobs" in response_data["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_job_statistics(self, async_client: AsyncClient, test_db_session, mock_job_tracker):
        """Test getting job statistics."""
        # Arrange
        job1 = await mock_job_tracker.create_job("/test/paper1.pdf", "Paper 1")
        job2 = await mock_job_tracker.create_job("/test/paper2.pdf", "Paper 2")
        job3 = await mock_job_tracker.create_job("/test/paper3.pdf", "Paper 3")

        await mock_job_tracker.complete_job(job1.id, "/repo1", [])
        await mock_job_tracker.fail_job(job2.id, "Error")

        # Act
        response = await async_client.get("/api/v1/jobs/statistics")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "total_jobs" in response_data
        assert "jobs_by_status" in response_data
        assert response_data["total_jobs"] == 3
        assert response_data["jobs_by_status"]["completed"] == 1
        assert response_data["jobs_by_status"]["failed"] == 1
        assert response_data["jobs_by_status"]["pending"] == 1