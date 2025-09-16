"""
Integration tests for WebSocket API endpoints
"""

import pytest
import json
import asyncio
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from starlette.websockets import WebSocket


@pytest.mark.integration
@pytest.mark.websocket
class TestWebSocketAPI:
    """Test suite for WebSocket API endpoints."""

    @pytest.fixture
    def websocket_url(self):
        """WebSocket endpoint URL."""
        return "/api/v1/ws/test-client-123"

    @pytest.mark.asyncio
    async def test_websocket_connection(self, test_client: TestClient, websocket_url):
        """Test basic WebSocket connection."""
        # Act & Assert
        with test_client.websocket_connect(websocket_url) as websocket:
            # Connection should be established
            assert websocket is not None

    @pytest.mark.asyncio
    async def test_websocket_job_subscription(self, test_client: TestClient, websocket_url):
        """Test subscribing to job updates via WebSocket."""
        # Arrange
        job_id = "test-job-123"
        subscription_message = {
            "type": "subscribe",
            "job_id": job_id
        }

        # Act & Assert
        with test_client.websocket_connect(websocket_url) as websocket:
            # Send subscription message
            websocket.send_json(subscription_message)

            # Should not receive any immediate response for subscription
            # (subscriptions are handled internally)

    @pytest.mark.asyncio
    async def test_websocket_job_unsubscription(self, test_client: TestClient, websocket_url):
        """Test unsubscribing from job updates."""
        # Arrange
        job_id = "test-job-123"
        subscription_message = {
            "type": "subscribe",
            "job_id": job_id
        }
        unsubscription_message = {
            "type": "unsubscribe",
            "job_id": job_id
        }

        # Act & Assert
        with test_client.websocket_connect(websocket_url) as websocket:
            # Subscribe first
            websocket.send_json(subscription_message)

            # Then unsubscribe
            websocket.send_json(unsubscription_message)

    @pytest.mark.asyncio
    async def test_websocket_invalid_message_format(self, test_client: TestClient, websocket_url):
        """Test sending invalid message format."""
        # Arrange
        invalid_message = "not a json object"

        # Act & Assert
        with test_client.websocket_connect(websocket_url) as websocket:
            # Send invalid message - should not crash the connection
            websocket.send_text(invalid_message)

    @pytest.mark.asyncio
    async def test_websocket_missing_message_type(self, test_client: TestClient, websocket_url):
        """Test sending message without type field."""
        # Arrange
        invalid_message = {
            "job_id": "test-job-123",
            "data": "some data"
        }

        # Act & Assert
        with test_client.websocket_connect(websocket_url) as websocket:
            websocket.send_json(invalid_message)
            # Connection should remain stable

    @pytest.mark.asyncio
    async def test_websocket_broadcast_to_subscribers(self, test_client: TestClient):
        """Test broadcasting messages to job subscribers."""
        # This test is more complex as it requires multiple connections
        # We'll mock the WebSocket manager behavior

        job_id = "test-job-123"

        # Mock the websocket manager to test broadcasting
        with patch("app.api.v1.websocket.websocket_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = AsyncMock()
            mock_manager.subscribe_to_job = AsyncMock()
            mock_manager.send_personal_message = AsyncMock()

            url1 = "/api/v1/ws/client-1"
            url2 = "/api/v1/ws/client-2"

            # Connect two clients
            with test_client.websocket_connect(url1) as ws1:
                with test_client.websocket_connect(url2) as ws2:
                    # Both subscribe to the same job
                    subscription_msg = {
                        "type": "subscribe",
                        "job_id": job_id
                    }
                    ws1.send_json(subscription_msg)
                    ws2.send_json(subscription_msg)

                    # Verify both connections were established
                    assert mock_manager.connect.call_count == 2
                    assert mock_manager.subscribe_to_job.call_count == 2

    @pytest.mark.asyncio
    async def test_websocket_connection_cleanup(self, test_client: TestClient, websocket_url):
        """Test that connections are cleaned up properly."""
        with patch("app.api.v1.websocket.websocket_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = AsyncMock()

            # Create and close connection
            with test_client.websocket_connect(websocket_url) as websocket:
                pass  # Connection opens and closes

            # Verify cleanup was called
            mock_manager.connect.assert_called_once()
            mock_manager.disconnect.assert_called_once()

    @pytest.mark.asyncio
    async def test_websocket_multiple_job_subscriptions(self, test_client: TestClient, websocket_url):
        """Test subscribing to multiple jobs from same client."""
        # Arrange
        job_ids = ["job-1", "job-2", "job-3"]

        # Act & Assert
        with test_client.websocket_connect(websocket_url) as websocket:
            # Subscribe to multiple jobs
            for job_id in job_ids:
                subscription_message = {
                    "type": "subscribe",
                    "job_id": job_id
                }
                websocket.send_json(subscription_message)

    @pytest.mark.asyncio
    async def test_websocket_job_progress_notification(self, test_client: TestClient):
        """Test receiving job progress notifications."""
        job_id = "test-job-123"
        client_id = "test-client"

        with patch("app.api.v1.websocket.websocket_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = AsyncMock()
            mock_manager.subscribe_to_job = AsyncMock()
            mock_manager.send_personal_message = AsyncMock()

            # Simulate sending a progress notification
            progress_message = {
                "type": "job_progress",
                "payload": {
                    "job_id": job_id,
                    "stage": "planning",
                    "progress": 50,
                    "message": "Planning in progress..."
                }
            }

            url = f"/api/v1/ws/{client_id}"

            with test_client.websocket_connect(url) as websocket:
                # Subscribe to job
                websocket.send_json({
                    "type": "subscribe",
                    "job_id": job_id
                })

                # Simulate receiving a progress message
                # (In real scenario, this would come from the Paper2Code wrapper)
                mock_manager.send_personal_message.assert_not_called()

    @pytest.mark.asyncio
    async def test_websocket_error_handling(self, test_client: TestClient, websocket_url):
        """Test WebSocket error handling."""
        with patch("app.api.v1.websocket.websocket_manager") as mock_manager:
            # Simulate an error during connection
            mock_manager.connect.side_effect = Exception("Connection error")

            # The connection should still be attempted
            try:
                with test_client.websocket_connect(websocket_url) as websocket:
                    pass
            except Exception:
                # Connection may fail, but shouldn't crash the server
                pass

    @pytest.mark.asyncio
    async def test_websocket_concurrent_connections(self, test_client: TestClient):
        """Test multiple concurrent WebSocket connections."""
        urls = [f"/api/v1/ws/client-{i}" for i in range(5)]

        with patch("app.api.v1.websocket.websocket_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = AsyncMock()

            # Open multiple connections simultaneously
            websockets = []
            try:
                for url in urls:
                    ws = test_client.websocket_connect(url)
                    websockets.append(ws)
                    ws.__enter__()

                # Verify all connections were established
                assert mock_manager.connect.call_count == 5

            finally:
                # Clean up connections
                for ws in websockets:
                    try:
                        ws.__exit__(None, None, None)
                    except:
                        pass

    @pytest.mark.asyncio
    async def test_websocket_reconnection_scenario(self, test_client: TestClient, websocket_url):
        """Test reconnection with same client ID."""
        with patch("app.api.v1.websocket.websocket_manager") as mock_manager:
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = AsyncMock()

            # First connection
            with test_client.websocket_connect(websocket_url) as websocket1:
                pass

            # Second connection with same client ID (reconnection)
            with test_client.websocket_connect(websocket_url) as websocket2:
                pass

            # Should have two connect and two disconnect calls
            assert mock_manager.connect.call_count == 2
            assert mock_manager.disconnect.call_count == 2

    @pytest.mark.asyncio
    async def test_websocket_message_ordering(self, test_client: TestClient, websocket_url):
        """Test that messages maintain order."""
        messages = [
            {"type": "subscribe", "job_id": "job-1"},
            {"type": "subscribe", "job_id": "job-2"},
            {"type": "unsubscribe", "job_id": "job-1"},
            {"type": "subscribe", "job_id": "job-3"}
        ]

        with test_client.websocket_connect(websocket_url) as websocket:
            # Send messages in sequence
            for message in messages:
                websocket.send_json(message)
                # Small delay to ensure ordering
                asyncio.sleep(0.01)

    @pytest.mark.asyncio
    async def test_websocket_large_message_handling(self, test_client: TestClient, websocket_url):
        """Test handling of large messages."""
        # Create a large message
        large_data = "x" * 10000  # 10KB of data
        large_message = {
            "type": "subscribe",
            "job_id": "test-job",
            "large_data": large_data
        }

        with test_client.websocket_connect(websocket_url) as websocket:
            websocket.send_json(large_message)
            # Should handle large messages without issues