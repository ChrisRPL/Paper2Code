"""
Unit tests for WebSocketManagerService
"""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import WebSocket

from app.services.websocket_manager import WebSocketManagerService
from app.schemas.websocket import WebSocketMessage, MessageType


@pytest.mark.unit
@pytest.mark.websocket
class TestWebSocketManagerService:
    """Test suite for WebSocketManagerService."""

    @pytest.fixture
    def websocket_manager(self):
        """Create a WebSocketManagerService instance."""
        return WebSocketManagerService()

    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket connection."""
        ws = AsyncMock(spec=WebSocket)
        ws.accept = AsyncMock()
        ws.send_json = AsyncMock()
        ws.receive_json = AsyncMock()
        ws.close = AsyncMock()
        return ws

    @pytest.mark.asyncio
    async def test_connect_client(self, websocket_manager, mock_websocket):
        """Test connecting a new WebSocket client."""
        # Arrange
        client_id = "test-client-123"

        # Act
        await websocket_manager.connect(client_id, mock_websocket)

        # Assert
        assert client_id in websocket_manager._connections
        assert websocket_manager._connections[client_id] == mock_websocket
        mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_disconnect_client(self, websocket_manager, mock_websocket):
        """Test disconnecting a WebSocket client."""
        # Arrange
        client_id = "test-client-123"
        await websocket_manager.connect(client_id, mock_websocket)

        # Act
        websocket_manager.disconnect(client_id)

        # Assert
        assert client_id not in websocket_manager._connections
        assert client_id not in websocket_manager._subscriptions

    @pytest.mark.asyncio
    async def test_subscribe_to_job(self, websocket_manager, mock_websocket):
        """Test subscribing a client to job updates."""
        # Arrange
        client_id = "test-client-123"
        job_id = "job-456"
        await websocket_manager.connect(client_id, mock_websocket)

        # Act
        websocket_manager.subscribe_to_job(client_id, job_id)

        # Assert
        assert job_id in websocket_manager._subscriptions
        assert client_id in websocket_manager._subscriptions[job_id]

    @pytest.mark.asyncio
    async def test_unsubscribe_from_job(self, websocket_manager, mock_websocket):
        """Test unsubscribing a client from job updates."""
        # Arrange
        client_id = "test-client-123"
        job_id = "job-456"
        await websocket_manager.connect(client_id, mock_websocket)
        websocket_manager.subscribe_to_job(client_id, job_id)

        # Act
        websocket_manager.unsubscribe_from_job(client_id, job_id)

        # Assert
        assert client_id not in websocket_manager._subscriptions.get(job_id, set())

    @pytest.mark.asyncio
    async def test_send_personal_message(self, websocket_manager, mock_websocket):
        """Test sending a message to a specific client."""
        # Arrange
        client_id = "test-client-123"
        await websocket_manager.connect(client_id, mock_websocket)
        message = {"type": "test", "data": "hello"}

        # Act
        await websocket_manager.send_personal_message(client_id, message)

        # Assert
        mock_websocket.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_send_personal_message_to_disconnected_client(self, websocket_manager):
        """Test sending a message to a disconnected client (should not raise)."""
        # Arrange
        client_id = "disconnected-client"
        message = {"type": "test", "data": "hello"}

        # Act & Assert - Should not raise exception
        await websocket_manager.send_personal_message(client_id, message)

    @pytest.mark.asyncio
    async def test_broadcast_to_job(self, websocket_manager, mock_websocket):
        """Test broadcasting a message to all clients subscribed to a job."""
        # Arrange
        client1 = "client-1"
        client2 = "client-2"
        job_id = "job-123"
        ws1 = AsyncMock(spec=WebSocket)
        ws2 = AsyncMock(spec=WebSocket)

        await websocket_manager.connect(client1, ws1)
        await websocket_manager.connect(client2, ws2)
        websocket_manager.subscribe_to_job(client1, job_id)
        websocket_manager.subscribe_to_job(client2, job_id)

        message = {"type": "job_update", "job_id": job_id, "status": "processing"}

        # Act
        await websocket_manager.broadcast_to_job(job_id, message)

        # Assert
        ws1.send_json.assert_called_once_with(message)
        ws2.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_send_job_started(self, websocket_manager, mock_websocket):
        """Test sending job started notification."""
        # Arrange
        client_id = "client-1"
        job_id = "job-123"
        paper_name = "Test Paper"
        stage = "preprocessing"

        await websocket_manager.connect(client_id, mock_websocket)
        websocket_manager.subscribe_to_job(client_id, job_id)

        # Act
        await websocket_manager.send_job_started(job_id, paper_name, stage)

        # Assert
        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == MessageType.JOB_STARTED
        assert call_args["payload"]["job_id"] == job_id
        assert call_args["payload"]["paper_name"] == paper_name
        assert call_args["payload"]["stage"] == stage

    @pytest.mark.asyncio
    async def test_send_job_progress(self, websocket_manager, mock_websocket):
        """Test sending job progress update."""
        # Arrange
        client_id = "client-1"
        job_id = "job-123"
        stage = "planning"
        progress = 50
        message = "Processing planning stage..."

        await websocket_manager.connect(client_id, mock_websocket)
        websocket_manager.subscribe_to_job(client_id, job_id)

        # Act
        await websocket_manager.send_job_progress(job_id, stage, progress, message)

        # Assert
        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == MessageType.JOB_PROGRESS
        assert call_args["payload"]["job_id"] == job_id
        assert call_args["payload"]["stage"] == stage
        assert call_args["payload"]["progress"] == progress
        assert call_args["payload"]["message"] == message

    @pytest.mark.asyncio
    async def test_send_job_completed(self, websocket_manager, mock_websocket):
        """Test sending job completion notification."""
        # Arrange
        client_id = "client-1"
        job_id = "job-123"
        repository_path = "/outputs/test_repo"

        await websocket_manager.connect(client_id, mock_websocket)
        websocket_manager.subscribe_to_job(client_id, job_id)

        # Act
        await websocket_manager.send_job_completed(job_id, repository_path)

        # Assert
        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == MessageType.JOB_COMPLETED
        assert call_args["payload"]["job_id"] == job_id
        assert call_args["payload"]["repository_path"] == repository_path

    @pytest.mark.asyncio
    async def test_send_job_error(self, websocket_manager, mock_websocket):
        """Test sending job error notification."""
        # Arrange
        client_id = "client-1"
        job_id = "job-123"
        error_message = "Processing failed"

        await websocket_manager.connect(client_id, mock_websocket)
        websocket_manager.subscribe_to_job(client_id, job_id)

        # Act
        await websocket_manager.send_job_error(job_id, error_message)

        # Assert
        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == MessageType.JOB_ERROR
        assert call_args["payload"]["job_id"] == job_id
        assert call_args["payload"]["error"] == error_message

    @pytest.mark.asyncio
    async def test_send_stage_log(self, websocket_manager, mock_websocket):
        """Test sending stage log message."""
        # Arrange
        client_id = "client-1"
        job_id = "job-123"
        stage = "analysis"
        log_type = "stdout"
        log_message = "Analyzing paper content..."

        await websocket_manager.connect(client_id, mock_websocket)
        websocket_manager.subscribe_to_job(client_id, job_id)

        # Act
        await websocket_manager.send_stage_log(job_id, stage, log_type, log_message)

        # Assert
        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == MessageType.STAGE_LOG
        assert call_args["payload"]["job_id"] == job_id
        assert call_args["payload"]["stage"] == stage
        assert call_args["payload"]["log_type"] == log_type
        assert call_args["payload"]["message"] == log_message

    @pytest.mark.asyncio
    async def test_get_connection_count(self, websocket_manager):
        """Test getting the number of active connections."""
        # Arrange
        ws1 = AsyncMock(spec=WebSocket)
        ws2 = AsyncMock(spec=WebSocket)
        ws3 = AsyncMock(spec=WebSocket)

        # Act & Assert
        assert websocket_manager.get_connection_count() == 0

        await websocket_manager.connect("client-1", ws1)
        assert websocket_manager.get_connection_count() == 1

        await websocket_manager.connect("client-2", ws2)
        await websocket_manager.connect("client-3", ws3)
        assert websocket_manager.get_connection_count() == 3

        websocket_manager.disconnect("client-2")
        assert websocket_manager.get_connection_count() == 2

    @pytest.mark.asyncio
    async def test_cleanup_disconnected_clients(self, websocket_manager):
        """Test cleanup of disconnected clients from subscriptions."""
        # Arrange
        client1 = "client-1"
        client2 = "client-2"
        job_id = "job-123"
        ws1 = AsyncMock(spec=WebSocket)
        ws2 = AsyncMock(spec=WebSocket)

        await websocket_manager.connect(client1, ws1)
        await websocket_manager.connect(client2, ws2)
        websocket_manager.subscribe_to_job(client1, job_id)
        websocket_manager.subscribe_to_job(client2, job_id)

        # Act
        websocket_manager.disconnect(client1)

        # Assert
        assert client1 not in websocket_manager._subscriptions[job_id]
        assert client2 in websocket_manager._subscriptions[job_id]

    @pytest.mark.asyncio
    async def test_handle_websocket_exception(self, websocket_manager, mock_websocket):
        """Test handling exceptions during WebSocket communication."""
        # Arrange
        client_id = "client-1"
        await websocket_manager.connect(client_id, mock_websocket)
        mock_websocket.send_json.side_effect = Exception("Connection lost")

        # Act - Should not raise exception
        await websocket_manager.send_personal_message(client_id, {"test": "data"})

        # Assert - Client should be disconnected
        assert client_id not in websocket_manager._connections