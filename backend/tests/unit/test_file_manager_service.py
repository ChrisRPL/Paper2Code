"""
Unit tests for FileManagerService
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import UploadFile

from app.services.file_manager import FileManagerService


@pytest.mark.unit
class TestFileManagerService:
    """Test suite for FileManagerService."""

    @pytest.fixture
    def file_manager(self, temp_upload_dir, temp_output_dir):
        """Create a FileManagerService with temp directories."""
        manager = FileManagerService()
        # Mock the settings to use temp directories
        with patch("app.services.file_manager.settings") as mock_settings:
            mock_settings.UPLOAD_DIR = str(temp_upload_dir)
            mock_settings.OUTPUT_DIR = str(temp_output_dir)
            mock_settings.MAX_FILE_SIZE = 104857600  # 100MB
            yield manager

    @pytest.fixture
    def mock_upload_file(self, sample_pdf_bytes):
        """Create a mock UploadFile object."""
        upload_file = MagicMock(spec=UploadFile)
        upload_file.filename = "test_paper.pdf"
        upload_file.size = len(sample_pdf_bytes)
        upload_file.read = AsyncMock(return_value=sample_pdf_bytes)
        upload_file.seek = AsyncMock()
        return upload_file

    @pytest.mark.asyncio
    async def test_save_upload_file(self, file_manager, mock_upload_file, temp_upload_dir):
        """Test saving an uploaded file."""
        # Arrange
        job_id = "test-job-123"

        # Act
        with patch("app.services.file_manager.settings") as mock_settings:
            mock_settings.UPLOAD_DIR = str(temp_upload_dir)
            file_path = await file_manager.save_upload_file(mock_upload_file, job_id)

        # Assert
        assert file_path is not None
        assert Path(file_path).exists()
        assert Path(file_path).name == f"{job_id}_test_paper.pdf"
        assert Path(file_path).parent == temp_upload_dir

    @pytest.mark.asyncio
    async def test_validate_pdf_file_valid(self, file_manager, sample_pdf_bytes):
        """Test validating a valid PDF file."""
        # Act
        is_valid = await file_manager.validate_pdf_file(sample_pdf_bytes)

        # Assert
        assert is_valid is True

    @pytest.mark.asyncio
    async def test_validate_pdf_file_invalid(self, file_manager):
        """Test validating an invalid PDF file."""
        # Arrange
        invalid_content = b"This is not a PDF file"

        # Act
        is_valid = await file_manager.validate_pdf_file(invalid_content)

        # Assert
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_validate_file_size_within_limit(self, file_manager, mock_upload_file):
        """Test file size validation within limit."""
        # Arrange
        mock_upload_file.size = 50 * 1024 * 1024  # 50MB

        # Act
        with patch("app.services.file_manager.settings") as mock_settings:
            mock_settings.MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
            is_valid = file_manager.validate_file_size(mock_upload_file)

        # Assert
        assert is_valid is True

    @pytest.mark.asyncio
    async def test_validate_file_size_exceeds_limit(self, file_manager, mock_upload_file):
        """Test file size validation exceeding limit."""
        # Arrange
        mock_upload_file.size = 150 * 1024 * 1024  # 150MB

        # Act
        with patch("app.services.file_manager.settings") as mock_settings:
            mock_settings.MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
            is_valid = file_manager.validate_file_size(mock_upload_file)

        # Assert
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_validate_file_extension_valid(self, file_manager):
        """Test validating valid file extensions."""
        # Arrange
        valid_filenames = ["paper.pdf", "document.PDF", "test.Pdf"]

        # Act & Assert
        for filename in valid_filenames:
            is_valid = file_manager.validate_file_extension(filename)
            assert is_valid is True, f"Failed for {filename}"

    @pytest.mark.asyncio
    async def test_validate_file_extension_invalid(self, file_manager):
        """Test validating invalid file extensions."""
        # Arrange
        invalid_filenames = ["paper.txt", "document.doc", "test.jpg", "file"]

        # Act & Assert
        for filename in invalid_filenames:
            is_valid = file_manager.validate_file_extension(filename)
            assert is_valid is False, f"Should have failed for {filename}"

    @pytest.mark.asyncio
    async def test_delete_file(self, file_manager, temp_upload_dir):
        """Test deleting a file."""
        # Arrange
        test_file = temp_upload_dir / "test_file.pdf"
        test_file.write_text("test content")
        assert test_file.exists()

        # Act
        success = await file_manager.delete_file(str(test_file))

        # Assert
        assert success is True
        assert not test_file.exists()

    @pytest.mark.asyncio
    async def test_delete_nonexistent_file(self, file_manager):
        """Test deleting a non-existent file."""
        # Arrange
        file_path = "/nonexistent/file.pdf"

        # Act
        success = await file_manager.delete_file(file_path)

        # Assert
        assert success is False

    @pytest.mark.asyncio
    async def test_create_job_output_directory(self, file_manager, temp_output_dir):
        """Test creating job output directory."""
        # Arrange
        job_id = "test-job-123"

        # Act
        with patch("app.services.file_manager.settings") as mock_settings:
            mock_settings.OUTPUT_DIR = str(temp_output_dir)
            output_dir = await file_manager.create_job_output_directory(job_id)

        # Assert
        assert output_dir is not None
        assert Path(output_dir).exists()
        assert Path(output_dir).name == job_id
        assert Path(output_dir).parent == temp_output_dir

    @pytest.mark.asyncio
    async def test_get_file_info(self, file_manager, sample_pdf_path):
        """Test getting file information."""
        # Act
        file_info = await file_manager.get_file_info(str(sample_pdf_path))

        # Assert
        assert file_info is not None
        assert file_info["name"] == "test_paper.pdf"
        assert file_info["size"] > 0
        assert file_info["extension"] == ".pdf"
        assert "created_at" in file_info
        assert "modified_at" in file_info

    @pytest.mark.asyncio
    async def test_get_file_info_nonexistent(self, file_manager):
        """Test getting info for non-existent file."""
        # Act
        file_info = await file_manager.get_file_info("/nonexistent/file.pdf")

        # Assert
        assert file_info is None

    @pytest.mark.asyncio
    async def test_cleanup_old_files(self, file_manager, temp_upload_dir):
        """Test cleaning up old files."""
        # Arrange
        import time
        from datetime import datetime, timedelta

        # Create test files with different ages
        old_file = temp_upload_dir / "old_file.pdf"
        new_file = temp_upload_dir / "new_file.pdf"

        old_file.write_text("old content")
        new_file.write_text("new content")

        # Make old_file older than threshold
        old_time = time.time() - (8 * 24 * 60 * 60)  # 8 days ago
        os.utime(old_file, (old_time, old_time))

        # Act
        with patch("app.services.file_manager.settings") as mock_settings:
            mock_settings.UPLOAD_DIR = str(temp_upload_dir)
            deleted_count = await file_manager.cleanup_old_files(days_threshold=7)

        # Assert
        assert deleted_count == 1
        assert not old_file.exists()
        assert new_file.exists()

    @pytest.mark.asyncio
    async def test_process_pdf_to_json(self, file_manager, sample_pdf_path, temp_output_dir):
        """Test processing PDF to JSON conversion (mocked)."""
        # Arrange
        job_id = "test-job-123"

        # Mock the subprocess call to s2orc-doc2json
        with patch("app.services.file_manager.subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "Processing complete"

            # Act
            with patch("app.services.file_manager.settings") as mock_settings:
                mock_settings.OUTPUT_DIR = str(temp_output_dir)
                json_path = await file_manager.process_pdf_to_json(
                    str(sample_pdf_path),
                    job_id
                )

            # Assert
            assert json_path is not None
            mock_run.assert_called()

    @pytest.mark.asyncio
    async def test_compress_directory(self, file_manager, temp_output_dir):
        """Test compressing a directory to zip."""
        # Arrange
        test_dir = temp_output_dir / "test_repo"
        test_dir.mkdir()
        (test_dir / "file1.py").write_text("print('hello')")
        (test_dir / "file2.py").write_text("print('world')")

        # Act
        zip_path = await file_manager.compress_directory(str(test_dir))

        # Assert
        assert zip_path is not None
        assert Path(zip_path).exists()
        assert Path(zip_path).suffix == ".zip"

    @pytest.mark.asyncio
    async def test_get_directory_size(self, file_manager, temp_output_dir):
        """Test calculating directory size."""
        # Arrange
        test_dir = temp_output_dir / "test_dir"
        test_dir.mkdir()
        (test_dir / "file1.txt").write_text("a" * 1000)
        (test_dir / "file2.txt").write_text("b" * 2000)
        sub_dir = test_dir / "subdir"
        sub_dir.mkdir()
        (sub_dir / "file3.txt").write_text("c" * 3000)

        # Act
        size = await file_manager.get_directory_size(str(test_dir))

        # Assert
        assert size == 6000  # Total of all file sizes