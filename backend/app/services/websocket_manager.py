"""
WebSocket management service for real-time communication
"""

from fastapi import WebSocket
from typing import Dict, List, Set, Optional, Any
import json
import asyncio
from datetime import datetime
import logging

from ..schemas.websocket import WebSocketMessage, WebSocketMessageType

logger = logging.getLogger(__name__)

class WebSocketManagerService:
    """Service for managing WebSocket connections and real-time updates"""
    
    def __init__(self):
        # Active WebSocket connections
        self.active_connections: List[WebSocket] = []
        
        # Job subscriptions: job_id -> set of websockets subscribed to that job
        self.job_subscriptions: Dict[str, Set[WebSocket]] = {}
        
        # Connection metadata: websocket -> connection info
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection"""
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            
            # Store connection metadata
            self.connection_metadata[websocket] = {
                "connected_at": datetime.utcnow(),
                "subscribed_jobs": set()
            }
            
            logger.info(f"New WebSocket connection established. Total connections: {len(self.active_connections)}")
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket: {e}")
    
    async def disconnect(self, websocket: WebSocket):
        """Handle WebSocket disconnection"""
        try:
            # Remove from active connections
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            
            # Remove from all job subscriptions
            for job_id in list(self.job_subscriptions.keys()):
                if websocket in self.job_subscriptions[job_id]:
                    self.job_subscriptions[job_id].discard(websocket)
                    # Clean up empty job subscriptions
                    if not self.job_subscriptions[job_id]:
                        del self.job_subscriptions[job_id]
            
            # Remove connection metadata
            self.connection_metadata.pop(websocket, None)
            
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
            
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket: {e}")
    
    async def send_to_client(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send a message to a specific WebSocket client"""
        try:
            if websocket in self.active_connections:
                await websocket.send_text(json.dumps(message))
                return True
            else:
                logger.warning("Attempted to send message to inactive WebSocket connection")
                return False
                
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")
            # Remove disconnected websocket
            await self.disconnect(websocket)
            return False
    
    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients"""
        if not self.active_connections:
            return
        
        disconnected_clients = []
        
        for websocket in self.active_connections:
            success = await self.send_to_client(websocket, message)
            if not success:
                disconnected_clients.append(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected_clients:
            await self.disconnect(websocket)
    
    async def subscribe_to_job(self, websocket: WebSocket, job_id: str):
        """Subscribe a WebSocket to job updates"""
        try:
            if job_id not in self.job_subscriptions:
                self.job_subscriptions[job_id] = set()
            
            self.job_subscriptions[job_id].add(websocket)
            
            # Update connection metadata
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["subscribed_jobs"].add(job_id)
            
            logger.info(f"WebSocket subscribed to job {job_id}")
            
        except Exception as e:
            logger.error(f"Error subscribing to job {job_id}: {e}")
    
    async def unsubscribe_from_job(self, websocket: WebSocket, job_id: str):
        """Unsubscribe a WebSocket from job updates"""
        try:
            if job_id in self.job_subscriptions:
                self.job_subscriptions[job_id].discard(websocket)
                
                # Clean up empty subscription
                if not self.job_subscriptions[job_id]:
                    del self.job_subscriptions[job_id]
            
            # Update connection metadata
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["subscribed_jobs"].discard(job_id)
            
            logger.info(f"WebSocket unsubscribed from job {job_id}")
            
        except Exception as e:
            logger.error(f"Error unsubscribing from job {job_id}: {e}")
    
    async def broadcast_to_job_subscribers(self, job_id: str, message: Dict[str, Any]):
        """Broadcast a message to all clients subscribed to a specific job"""
        try:
            if job_id not in self.job_subscriptions:
                logger.debug(f"No subscribers for job {job_id}")
                return
            
            subscribers = list(self.job_subscriptions[job_id])  # Copy to avoid modification during iteration
            disconnected_clients = []
            
            logger.info(f"Broadcasting to {len(subscribers)} subscribers for job {job_id}")
            
            for websocket in subscribers:
                success = await self.send_to_client(websocket, message)
                if not success:
                    disconnected_clients.append(websocket)
            
            # Clean up disconnected clients
            for websocket in disconnected_clients:
                await self.disconnect(websocket)
                
        except Exception as e:
            logger.error(f"Error broadcasting to job {job_id} subscribers: {e}")
    
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
    
    def get_job_subscription_count(self) -> Dict[str, int]:
        """Get subscription count for each job"""
        return {job_id: len(subscribers) for job_id, subscribers in self.job_subscriptions.items()}
    
    async def send_job_update(
        self,
        job_id: str,
        message_type: WebSocketMessageType,
        payload: Dict[str, Any]
    ):
        """
        Send a job update to all subscribers
        """
        message = {
            "type": message_type.value,
            "payload": {
                "job_id": job_id,
                **payload
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast_to_job_subscribers(job_id, message)
    
    async def send_job_started(self, job_id: str, filename: str, stage: str):
        """Send job started notification"""
        await self.send_job_update(
            job_id,
            WebSocketMessageType.JOB_STARTED,
            {
                "filename": filename,
                "stage": stage
            }
        )
    
    async def send_job_progress(
        self,
        job_id: str,
        stage: str,
        progress: int,
        message: Optional[str] = None
    ):
        """Send job progress update"""
        payload = {
            "stage": stage,
            "progress": progress
        }
        if message:
            payload["message"] = message
            
        await self.send_job_update(
            job_id,
            WebSocketMessageType.JOB_STAGE_UPDATE,
            payload
        )
    
    async def send_job_artifact(
        self,
        job_id: str,
        stage: str,
        artifact_type: str,
        artifact_data: Dict[str, Any]
    ):
        """Send job artifact update"""
        await self.send_job_update(
            job_id,
            WebSocketMessageType.JOB_ARTIFACT,
            {
                "stage": stage,
                "artifact_type": artifact_type,
                "artifact_data": artifact_data
            }
        )
    
    async def send_job_completed(
        self,
        job_id: str,
        repository_path: str,
        processing_time: Optional[int] = None
    ):
        """Send job completion notification"""
        payload = {
            "repository_path": repository_path
        }
        if processing_time:
            payload["processing_time"] = processing_time
            
        await self.send_job_update(
            job_id,
            WebSocketMessageType.JOB_COMPLETED,
            payload
        )
    
    async def send_job_error(
        self,
        job_id: str,
        error: str,
        stage: Optional[str] = None
    ):
        """Send job error notification"""
        payload = {
            "error": error
        }
        if stage:
            payload["stage"] = stage
            
        await self.send_job_update(
            job_id,
            WebSocketMessageType.JOB_ERROR,
            payload
        )
    
    async def send_agent_status(
        self,
        job_id: str,
        agent: str,
        status: str,
        progress: int,
        current_task: Optional[str] = None
    ):
        """Send agent status update"""
        payload = {
            "agent": agent,
            "status": status,
            "progress": progress
        }
        if current_task:
            payload["current_task"] = current_task
            
        await self.send_job_update(
            job_id,
            WebSocketMessageType.AGENT_STATUS,
            payload
        )
    
    async def send_chat_message(
        self,
        job_id: str,
        message: str,
        message_type: str = "system"
    ):
        """Send chat message update"""
        await self.send_job_update(
            job_id,
            WebSocketMessageType.CHAT_MESSAGE,
            {
                "message": message,
                "message_type": message_type
            }
        )
    
    async def send_stage_log(
        self,
        job_id: str,
        stage: str,
        stream_type: str,
        log_line: str
    ):
        """Send real-time stage log output"""
        await self.send_job_update(
            job_id,
            WebSocketMessageType.JOB_STAGE_UPDATE,
            {
                "stage": stage,
                "log": {
                    "stream": stream_type,
                    "message": log_line,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    async def cleanup_inactive_connections(self):
        """Clean up inactive WebSocket connections (for maintenance)"""
        inactive_connections = []
        
        for websocket in self.active_connections:
            try:
                # Send a ping to check if connection is alive
                await websocket.send_text(json.dumps({"type": "ping"}))
            except Exception:
                inactive_connections.append(websocket)
        
        # Remove inactive connections
        for websocket in inactive_connections:
            await self.disconnect(websocket)
        
        logger.info(f"Cleaned up {len(inactive_connections)} inactive connections")
        return len(inactive_connections)