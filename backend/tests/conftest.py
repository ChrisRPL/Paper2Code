"""
Pytest configuration and fixtures for backend tests
"""

import asyncio
import os
import tempfile
from pathlib import Path
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.services.websocket_manager import WebSocketManagerService
from app.services.job_tracker import JobTrackerService
from app.services.file_manager import FileManagerService


# Configure test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def test_db_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session_maker = async_sessionmaker(
        test_db_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def override_get_db(test_db_session: AsyncSession):
    """Override the database dependency."""
    async def _override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def test_client(override_get_db) -> TestClient:
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest_asyncio.fixture
async def async_client(override_get_db) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client for the FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def temp_upload_dir() -> Generator[Path, None, None]:
    """Create a temporary upload directory."""
    with tempfile.TemporaryDirectory() as temp_dir:
        upload_dir = Path(temp_dir) / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        yield upload_dir


@pytest.fixture
def temp_output_dir() -> Generator[Path, None, None]:
    """Create a temporary output directory."""
    with tempfile.TemporaryDirectory() as temp_dir:
        output_dir = Path(temp_dir) / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)
        yield output_dir


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Create sample PDF bytes for testing."""
    # Minimal valid PDF structure
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
217
%%EOF"""
    return pdf_content


@pytest.fixture
def sample_pdf_path(temp_upload_dir: Path, sample_pdf_bytes: bytes) -> Path:
    """Create a sample PDF file for testing."""
    pdf_path = temp_upload_dir / "test_paper.pdf"
    pdf_path.write_bytes(sample_pdf_bytes)
    return pdf_path


@pytest.fixture
def mock_websocket_manager() -> WebSocketManagerService:
    """Create a mock WebSocket manager service."""
    manager = AsyncMock(spec=WebSocketManagerService)
    manager.send_job_started = AsyncMock()
    manager.send_job_progress = AsyncMock()
    manager.send_job_completed = AsyncMock()
    manager.send_job_error = AsyncMock()
    manager.send_job_artifact = AsyncMock()
    manager.send_stage_log = AsyncMock()
    manager.get_connection_count = MagicMock(return_value=0)
    return manager


@pytest.fixture
def mock_job_tracker(test_db_session: AsyncSession) -> JobTrackerService:
    """Create a JobTrackerService with test database."""
    return JobTrackerService()


@pytest.fixture
def mock_file_manager(temp_upload_dir: Path, temp_output_dir: Path) -> FileManagerService:
    """Create a FileManagerService with temporary directories."""
    manager = FileManagerService()
    # Override paths with temp directories
    settings.UPLOAD_DIR = str(temp_upload_dir)
    settings.OUTPUT_DIR = str(temp_output_dir)
    return manager


@pytest.fixture
def mock_paper2code_subprocess():
    """Mock subprocess for Paper2Code pipeline testing."""
    mock_process = AsyncMock()
    mock_process.stdout = AsyncMock()
    mock_process.stderr = AsyncMock()
    mock_process.wait = AsyncMock(return_value=0)

    async def mock_readline():
        # Simulate some output then EOF
        for line in [b"Processing...\n", b"Complete.\n"]:
            yield line
        while True:
            yield b""

    mock_process.stdout.readline = AsyncMock(side_effect=mock_readline().__anext__)
    mock_process.stderr.readline = AsyncMock(return_value=b"")

    return mock_process


@pytest.fixture
def job_data():
    """Sample job data for testing."""
    return {
        "id": "test-job-123",
        "paper_name": "Test Paper",
        "status": "pending",
        "progress": 0,
        "current_stage": None,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }


@pytest.fixture
def websocket_message_data():
    """Sample WebSocket message data for testing."""
    return {
        "type": "job_progress",
        "payload": {
            "job_id": "test-job-123",
            "stage": "planning",
            "progress": 25,
            "message": "Processing planning stage..."
        }
    }


# Environment variable fixtures
@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """Set up test environment variables."""
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("UPLOAD_DIR", "/tmp/test_uploads")
    monkeypatch.setenv("OUTPUT_DIR", "/tmp/test_outputs")
    monkeypatch.setenv("MAX_FILE_SIZE", "104857600")  # 100MB
    monkeypatch.setenv("ALLOWED_EXTENSIONS", ".pdf")


@pytest.fixture
def mock_openai_api_key(monkeypatch):
    """Mock OpenAI API key for testing."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-api-key")
    yield
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


# Markers for test organization
def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "unit: Mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: Mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: Mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "websocket: Mark test as WebSocket-specific"
    )