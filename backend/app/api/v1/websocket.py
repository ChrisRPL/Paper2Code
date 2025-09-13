"""
WebSocket endpoints for real-time communication
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from typing import Dict, List
import json
import asyncio
from datetime import datetime

from ...core.dependencies import get_websocket_manager
from ...services.websocket_manager import WebSocketManagerService
from ...schemas.websocket import WebSocketMessage, WebSocketMessageType

router = APIRouter()

@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time updates
    """
    # Get websocket manager instance (WebSocket endpoints don't support dependency injection)
    websocket_manager = get_websocket_manager()
    await websocket_manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle different message types
            message_type = message_data.get("type")
            payload = message_data.get("payload", {})
            
            if message_type == "ping":
                # Heartbeat/ping response
                await websocket_manager.send_to_client(websocket, {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            
            elif message_type == "subscribe_job":
                # Subscribe to job updates
                job_id = payload.get("job_id")
                if job_id:
                    await websocket_manager.subscribe_to_job(websocket, job_id)
                    await websocket_manager.send_to_client(websocket, {
                        "type": "subscribed",
                        "payload": {"job_id": job_id}
                    })
            
            elif message_type == "unsubscribe_job":
                # Unsubscribe from job updates
                job_id = payload.get("job_id")
                if job_id:
                    await websocket_manager.unsubscribe_from_job(websocket, job_id)
                    await websocket_manager.send_to_client(websocket, {
                        "type": "unsubscribed", 
                        "payload": {"job_id": job_id}
                    })
            
            else:
                # Unknown message type
                await websocket_manager.send_to_client(websocket, {
                    "type": "error",
                    "payload": {"message": f"Unknown message type: {message_type}"}
                })
                
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket_manager.disconnect(websocket)

@router.get("/active-connections")
async def get_active_connections(
    websocket_manager: WebSocketManagerService = Depends(get_websocket_manager)
):
    """
    Get number of active WebSocket connections (for debugging)
    """
    return {
        "active_connections": websocket_manager.get_connection_count(),
        "job_subscriptions": websocket_manager.get_job_subscription_count()
    }

# Helper functions for sending updates from other parts of the application
async def broadcast_job_update(job_id: str, update_data: dict):
    """
    Broadcast job update to all subscribed clients
    """
    websocket_manager = get_websocket_manager()
    await websocket_manager.broadcast_to_job_subscribers(job_id, {
        "type": "job_update",
        "payload": {
            "job_id": job_id,
            **update_data
        }
    })

async def broadcast_agent_status(job_id: str, agent_status: dict):
    """
    Broadcast agent status update
    """
    websocket_manager = get_websocket_manager()
    await websocket_manager.broadcast_to_job_subscribers(job_id, {
        "type": "agent_status",
        "payload": {
            "job_id": job_id,
            **agent_status
        }
    })

async def broadcast_chat_message(job_id: str, message: dict):
    """
    Broadcast chat message update
    """
    websocket_manager = get_websocket_manager()
    await websocket_manager.broadcast_to_job_subscribers(job_id, {
        "type": "chat_message",
        "payload": {
            "job_id": job_id,
            **message
        }
    })