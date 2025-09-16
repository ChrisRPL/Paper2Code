"""
Unit tests for Paper2CodeWrapper
"""

import pytest
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, call

from app.integration.paper_coder_wrapper import Paper2CodeWrapper
from app.models.job import ProcessingStage


@pytest.mark.unit
class TestPaper2CodeWrapper:
    """Test suite for Paper2CodeWrapper."""

    @pytest.fixture
    def mock_websocket_manager(self):
        """Create a mock WebSocket manager."""
        manager = AsyncMock()
        manager.send_job_started = AsyncMock()
        manager.send_job_progress = AsyncMock()
        manager.send_job_completed = AsyncMock()
        manager.send_job_error = AsyncMock()
        manager.send_job_artifact = AsyncMock()
        manager.send_stage_log = AsyncMock()
        manager.get_connection_count = MagicMock(return_value=1)
        return manager

    @pytest.fixture
    def paper_wrapper(self, mock_websocket_manager, temp_output_dir):
        """Create a Paper2CodeWrapper instance."""
        with patch("app.integration.paper_coder_wrapper.settings") as mock_settings:
            mock_settings.PAPER_CODER_CODES_DIR = str(Path(__file__).parent.parent.parent.parent / "codes")
            mock_settings.PAPER_CODER_SCRIPTS_DIR = str(Path(__file__).parent.parent.parent.parent / "scripts")
            mock_settings.PAPER_CODER_OUTPUT_BASE_DIR = str(temp_output_dir)

            # Mock path validation
            with patch.object(Path, "exists", return_value=True):
                wrapper = Paper2CodeWrapper(mock_websocket_manager)
                return wrapper

    @pytest.mark.asyncio
    async def test_initialization(self, mock_websocket_manager):
        """Test Paper2CodeWrapper initialization."""
        # Arrange & Act
        with patch("app.integration.paper_coder_wrapper.settings") as mock_settings:
            mock_settings.PAPER_CODER_CODES_DIR = "/test/codes"
            mock_settings.PAPER_CODER_SCRIPTS_DIR = "/test/scripts"
            mock_settings.PAPER_CODER_OUTPUT_BASE_DIR = "/test/outputs"

            with patch.object(Path, "exists", return_value=True):
                wrapper = Paper2CodeWrapper(mock_websocket_manager)

        # Assert
        assert wrapper.websocket_manager == mock_websocket_manager
        assert wrapper.codes_dir == Path("/test/codes")
        assert wrapper.scripts_dir == Path("/test/scripts")
        assert wrapper.output_base_dir == Path("/test/outputs")

    @pytest.mark.asyncio
    async def test_validate_paths_missing_directory(self, mock_websocket_manager):
        """Test validation fails when required directories are missing."""
        # Arrange
        with patch("app.integration.paper_coder_wrapper.settings") as mock_settings:
            mock_settings.PAPER_CODER_CODES_DIR = "/nonexistent/codes"
            mock_settings.PAPER_CODER_SCRIPTS_DIR = "/test/scripts"
            mock_settings.PAPER_CODER_OUTPUT_BASE_DIR = "/test/outputs"

        # Act & Assert
        with pytest.raises(FileNotFoundError):
            Paper2CodeWrapper(mock_websocket_manager)

    @pytest.mark.asyncio
    async def test_run_subprocess_success(self, paper_wrapper):
        """Test successful subprocess execution."""
        # Arrange
        cmd = ["python", "test_script.py"]
        env = {"TEST": "value"}

        mock_process = AsyncMock()
        mock_process.wait = AsyncMock(return_value=0)
        mock_process.stdout.readline = AsyncMock(side_effect=[
            b"Line 1\n",
            b"Line 2\n",
            b""
        ])
        mock_process.stderr.readline = AsyncMock(return_value=b"")

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            # Act
            result = await paper_wrapper._run_subprocess(
                cmd, env, "Test process", "job-123", "test_stage"
            )

        # Assert
        assert result["success"] is True
        assert result["returncode"] == 0
        assert len(result["logs"]) >= 2

    @pytest.mark.asyncio
    async def test_run_subprocess_failure(self, paper_wrapper):
        """Test subprocess execution failure."""
        # Arrange
        cmd = ["python", "failing_script.py"]
        env = {}

        mock_process = AsyncMock()
        mock_process.wait = AsyncMock(return_value=1)
        mock_process.stdout.readline = AsyncMock(return_value=b"")
        mock_process.stderr.readline = AsyncMock(side_effect=[
            b"Error occurred\n",
            b""
        ])

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                await paper_wrapper._run_subprocess(
                    cmd, env, "Failing process"
                )

            assert "failed with return code 1" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_run_planning_stage(self, paper_wrapper, mock_websocket_manager):
        """Test running the planning stage."""
        # Arrange
        job_id = "test-job-123"
        pdf_json_path = "/test/paper.json"
        paper_name = "Test Paper"
        output_dir = paper_wrapper.output_base_dir / paper_name

        mock_process = AsyncMock()
        mock_process.wait = AsyncMock(return_value=0)
        mock_process.stdout.readline = AsyncMock(return_value=b"")
        mock_process.stderr.readline = AsyncMock(return_value=b"")

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            with patch("os.getenv", return_value="test-api-key"):
                # Act
                result = await paper_wrapper._run_planning_stage(
                    job_id, pdf_json_path, paper_name, output_dir
                )

        # Assert
        assert result["success"] is True
        mock_websocket_manager.send_job_progress.assert_called()

    @pytest.mark.asyncio
    async def test_run_analysis_stage(self, paper_wrapper, mock_websocket_manager):
        """Test running the analysis stage."""
        # Arrange
        job_id = "test-job-123"
        pdf_json_path = "/test/paper.json"
        paper_name = "Test Paper"
        output_dir = paper_wrapper.output_base_dir / paper_name

        mock_process = AsyncMock()
        mock_process.wait = AsyncMock(return_value=0)
        mock_process.stdout.readline = AsyncMock(return_value=b"")
        mock_process.stderr.readline = AsyncMock(return_value=b"")

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            with patch("os.getenv", return_value=None):  # Test open-source model path
                # Act
                result = await paper_wrapper._run_analysis_stage(
                    job_id, pdf_json_path, paper_name, output_dir
                )

        # Assert
        assert result["success"] is True
        mock_websocket_manager.send_job_progress.assert_called()

    @pytest.mark.asyncio
    async def test_run_coding_stage(self, paper_wrapper, mock_websocket_manager):
        """Test running the coding stage."""
        # Arrange
        job_id = "test-job-123"
        pdf_json_path = "/test/paper.json"
        paper_name = "Test Paper"
        output_dir = paper_wrapper.output_base_dir / paper_name
        repo_dir = paper_wrapper.output_base_dir / f"{paper_name}_repo"

        mock_process = AsyncMock()
        mock_process.wait = AsyncMock(return_value=0)
        mock_process.stdout.readline = AsyncMock(return_value=b"")
        mock_process.stderr.readline = AsyncMock(return_value=b"")

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            # Act
            result = await paper_wrapper._run_coding_stage(
                job_id, pdf_json_path, paper_name, output_dir, repo_dir
            )

        # Assert
        assert result["success"] is True
        assert result["repository_path"] == str(repo_dir)
        mock_websocket_manager.send_job_progress.assert_called()

    @pytest.mark.asyncio
    async def test_process_paper_complete_pipeline(self, paper_wrapper, mock_websocket_manager):
        """Test complete paper processing pipeline."""
        # Arrange
        job_id = "test-job-123"
        pdf_json_path = "/test/paper.json"
        paper_name = "Test Paper"

        # Mock subprocess for all stages
        mock_process = AsyncMock()
        mock_process.wait = AsyncMock(return_value=0)
        mock_process.stdout.readline = AsyncMock(return_value=b"")
        mock_process.stderr.readline = AsyncMock(return_value=b"")

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            with patch("app.integration.paper_coder_wrapper.JobTrackerService") as mock_tracker_class:
                mock_tracker = AsyncMock()
                mock_tracker.update_job_progress = AsyncMock()
                mock_tracker.complete_job = AsyncMock()
                mock_tracker_class.return_value = mock_tracker

                # Act
                repository_path = await paper_wrapper.process_paper(
                    job_id, pdf_json_path, paper_name
                )

        # Assert
        assert repository_path.endswith(f"{paper_name}_repo")

        # Verify all stages were executed
        assert mock_websocket_manager.send_job_started.called
        assert mock_websocket_manager.send_job_progress.call_count >= 3  # At least once per stage
        assert mock_websocket_manager.send_job_completed.called

        # Verify progress updates
        progress_calls = mock_websocket_manager.send_job_progress.call_args_list
        stages_seen = set()
        for call_args in progress_calls:
            if len(call_args[0]) > 1:
                stages_seen.add(call_args[0][1])

        assert "planning" in stages_seen or len(stages_seen) > 0

    @pytest.mark.asyncio
    async def test_process_paper_failure(self, paper_wrapper, mock_websocket_manager):
        """Test paper processing failure handling."""
        # Arrange
        job_id = "test-job-123"
        pdf_json_path = "/test/paper.json"

        # Mock subprocess to fail
        mock_process = AsyncMock()
        mock_process.wait = AsyncMock(return_value=1)
        mock_process.stdout.readline = AsyncMock(return_value=b"")
        mock_process.stderr.readline = AsyncMock(return_value=b"Error\n")

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            with patch("app.integration.paper_coder_wrapper.JobTrackerService") as mock_tracker_class:
                mock_tracker = AsyncMock()
                mock_tracker.update_job_progress = AsyncMock()
                mock_tracker.fail_job = AsyncMock()
                mock_tracker_class.return_value = mock_tracker

                # Act & Assert
                with pytest.raises(Exception) as exc_info:
                    await paper_wrapper.process_paper(job_id, pdf_json_path)

        # Verify error handling
        assert mock_websocket_manager.send_job_error.called
        assert mock_tracker.fail_job.called

    @pytest.mark.asyncio
    async def test_cancel_job(self, paper_wrapper):
        """Test cancelling a job."""
        # Arrange
        job_id = "test-job-123"

        with patch("app.integration.paper_coder_wrapper.JobTrackerService") as mock_tracker_class:
            mock_tracker = AsyncMock()
            mock_tracker.cancel_job = AsyncMock(return_value=True)
            mock_tracker_class.return_value = mock_tracker
            paper_wrapper.job_tracker = mock_tracker

            # Act
            result = await paper_wrapper.cancel_job(job_id)

        # Assert
        assert result is True
        mock_tracker.cancel_job.assert_called_once_with(job_id)

    @pytest.mark.asyncio
    async def test_get_processing_status(self, paper_wrapper):
        """Test getting processing status."""
        # Arrange
        with patch("os.getenv", return_value="test-api-key"):
            # Act
            status = paper_wrapper.get_processing_status()

        # Assert
        assert "codes_dir" in status
        assert "scripts_dir" in status
        assert "output_base_dir" in status
        assert status["openai_api_available"] is True
        assert "websocket_connections" in status
        assert "timestamp" in status

    @pytest.mark.asyncio
    async def test_stream_output_with_websocket(self, paper_wrapper, mock_websocket_manager):
        """Test streaming subprocess output via WebSocket."""
        # Arrange
        job_id = "test-job-123"
        stage = "planning"

        mock_process = AsyncMock()
        mock_process.wait = AsyncMock(return_value=0)

        # Simulate streaming output
        stdout_lines = [b"Planning started\n", b"Analyzing structure\n", b""]
        stderr_lines = [b"Warning: Large file\n", b""]

        mock_process.stdout.readline = AsyncMock(side_effect=stdout_lines)
        mock_process.stderr.readline = AsyncMock(side_effect=stderr_lines)

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            # Act
            result = await paper_wrapper._run_subprocess(
                ["python", "test.py"],
                {},
                "Test",
                job_id,
                stage
            )

        # Assert
        assert result["success"] is True

        # Verify WebSocket messages were sent
        stage_log_calls = mock_websocket_manager.send_stage_log.call_args_list
        assert len(stage_log_calls) >= 2  # At least one stdout and one stderr