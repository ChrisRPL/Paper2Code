"""
Integration tests for upload API endpoints
"""

import pytest
from io import BytesIO
from unittest.mock import AsyncMock, patch

from fastapi import status
from httpx import AsyncClient


@pytest.mark.integration
class TestUploadAPI:
    """Test suite for upload API endpoints."""

    @pytest.mark.asyncio
    async def test_upload_valid_pdf(self, async_client: AsyncClient, sample_pdf_bytes):
        """Test uploading a valid PDF file."""
        # Arrange
        files = {
            "file": ("test_paper.pdf", BytesIO(sample_pdf_bytes), "application/pdf")
        }
        data = {"paper_name": "Test Paper"}

        # Act
        response = await async_client.post("/api/v1/upload/", files=files, data=data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "job_id" in response_data
        assert "message" in response_data
        assert response_data["paper_name"] == "Test Paper"

    @pytest.mark.asyncio
    async def test_upload_without_file(self, async_client: AsyncClient):
        """Test upload request without file."""
        # Arrange
        data = {"paper_name": "Test Paper"}

        # Act
        response = await async_client.post("/api/v1/upload/", data=data)

        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_upload_invalid_file_type(self, async_client: AsyncClient):
        """Test uploading non-PDF file."""
        # Arrange
        text_content = b"This is not a PDF file"
        files = {
            "file": ("document.txt", BytesIO(text_content), "text/plain")
        }
        data = {"paper_name": "Test Paper"}

        # Act
        response = await async_client.post("/api/v1/upload/", files=files, data=data)

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert "Invalid file type" in response_data["detail"]

    @pytest.mark.asyncio
    async def test_upload_large_file(self, async_client: AsyncClient):
        """Test uploading file that exceeds size limit."""
        # Arrange
        large_content = b"x" * (200 * 1024 * 1024)  # 200MB
        files = {
            "file": ("large_paper.pdf", BytesIO(large_content), "application/pdf")
        }
        data = {"paper_name": "Large Paper"}

        with patch("app.core.config.settings.MAX_FILE_SIZE", 100 * 1024 * 1024):  # 100MB limit
            # Act
            response = await async_client.post("/api/v1/upload/", files=files, data=data)

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert "File size exceeds maximum" in response_data["detail"]

    @pytest.mark.asyncio
    async def test_upload_invalid_pdf_content(self, async_client: AsyncClient):
        """Test uploading file with PDF extension but invalid content."""
        # Arrange
        invalid_pdf = b"This looks like PDF but is not %PDF-"
        files = {
            "file": ("fake.pdf", BytesIO(invalid_pdf), "application/pdf")
        }
        data = {"paper_name": "Fake PDF"}

        # Act
        response = await async_client.post("/api/v1/upload/", files=files, data=data)

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert "Invalid PDF" in response_data["detail"]

    @pytest.mark.asyncio
    async def test_upload_without_paper_name(self, async_client: AsyncClient, sample_pdf_bytes):
        """Test upload without specifying paper name (should generate one)."""
        # Arrange
        files = {
            "file": ("test_paper.pdf", BytesIO(sample_pdf_bytes), "application/pdf")
        }

        # Act
        response = await async_client.post("/api/v1/upload/", files=files)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "job_id" in response_data
        assert "paper_name" in response_data
        # Should use filename without extension as paper name
        assert response_data["paper_name"] == "test_paper"

    @pytest.mark.asyncio
    async def test_upload_empty_file(self, async_client: AsyncClient):
        """Test uploading empty file."""
        # Arrange
        files = {
            "file": ("empty.pdf", BytesIO(b""), "application/pdf")
        }
        data = {"paper_name": "Empty Paper"}

        # Act
        response = await async_client.post("/api/v1/upload/", files=files, data=data)

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        response_data = response.json()
        assert "File is empty" in response_data["detail"]

    @pytest.mark.asyncio
    async def test_upload_special_characters_in_name(self, async_client: AsyncClient, sample_pdf_bytes):
        """Test upload with special characters in paper name."""
        # Arrange
        files = {
            "file": ("test_paper.pdf", BytesIO(sample_pdf_bytes), "application/pdf")
        }
        data = {"paper_name": "Paper with Special!@#$%^&*()Characters"}

        # Act
        response = await async_client.post("/api/v1/upload/", files=files, data=data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "job_id" in response_data
        # Paper name should be sanitized
        assert response_data["paper_name"] != data["paper_name"]

    @pytest.mark.asyncio
    async def test_upload_concurrent_requests(self, async_client: AsyncClient, sample_pdf_bytes):
        """Test multiple concurrent upload requests."""
        # Arrange
        files = {
            "file": ("test_paper.pdf", BytesIO(sample_pdf_bytes), "application/pdf")
        }

        async def upload_file(paper_name):
            data = {"paper_name": paper_name}
            return await async_client.post("/api/v1/upload/", files=files, data=data)

        # Act
        responses = await asyncio.gather(
            upload_file("Paper 1"),
            upload_file("Paper 2"),
            upload_file("Paper 3")
        )

        # Assert
        assert all(resp.status_code == status.HTTP_200_OK for resp in responses)
        job_ids = [resp.json()["job_id"] for resp in responses]
        assert len(set(job_ids)) == 3  # All job IDs should be unique

    @pytest.mark.asyncio
    async def test_upload_with_processing_error(self, async_client: AsyncClient, sample_pdf_bytes):
        """Test upload when background processing fails."""
        # Arrange
        files = {
            "file": ("test_paper.pdf", BytesIO(sample_pdf_bytes), "application/pdf")
        }
        data = {"paper_name": "Test Paper"}

        # Mock file manager to simulate processing failure
        with patch("app.services.file_manager.FileManagerService") as mock_file_manager:
            mock_file_manager.return_value.save_upload_file = AsyncMock(
                side_effect=Exception("Storage error")
            )

            # Act
            response = await async_client.post("/api/v1/upload/", files=files, data=data)

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.asyncio
    async def test_get_upload_status(self, async_client: AsyncClient):
        """Test getting upload status endpoint."""
        # Act
        response = await async_client.get("/api/v1/upload/status")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "max_file_size" in response_data
        assert "allowed_extensions" in response_data
        assert "active_uploads" in response_data

    @pytest.mark.asyncio
    async def test_upload_file_with_unicode_name(self, async_client: AsyncClient, sample_pdf_bytes):
        """Test uploading file with Unicode characters in filename."""
        # Arrange
        files = {
            "file": ("论文_测试.pdf", BytesIO(sample_pdf_bytes), "application/pdf")
        }
        data = {"paper_name": "Unicode Paper"}

        # Act
        response = await async_client.post("/api/v1/upload/", files=files, data=data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "job_id" in response_data