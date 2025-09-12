"""
WebSocket-related Pydantic schemas
"""

from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum

class WebSocketMessageType(str, Enum):
    """WebSocket message types"""
    # Job-related events
    JOB_STARTED = "job_started"
    JOB_STAGE_UPDATE = "job_stage_update"  
    JOB_ARTIFACT = "job_artifact"
    JOB_COMPLETED = "job_completed"
    JOB_ERROR = "job_error"
    
    # Chat-related events
    CHAT_MESSAGE = "chat_message"
    CHAT_TYPING = "chat_typing"
    
    # Agent-related events
    AGENT_STATUS = "agent_status"
    AGENT_LOG = "agent_log"
    
    # Connection events
    PING = "ping"
    PONG = "pong"
    SUBSCRIBED = "subscribed"
    UNSUBSCRIBED = "unsubscribed"
    ERROR = "error"

class WebSocketMessage(BaseModel):
    """Base WebSocket message structure"""
    type: WebSocketMessageType
    payload: Dict[str, Any]
    timestamp: datetime = datetime.now()
    
class WebSocketRequest(BaseModel):
    """Incoming WebSocket request"""
    type: Literal["ping", "subscribe_job", "unsubscribe_job"]
    payload: Dict[str, Any] = {}

# Specific message payloads
class JobStartedPayload(BaseModel):
    """Payload for job started event"""
    job_id: str
    stage: str
    filename: str

class JobStageUpdatePayload(BaseModel):
    """Payload for job stage update"""
    job_id: str
    stage: str
    progress: int
    message: Optional[str] = None
    
class JobArtifactPayload(BaseModel):
    """Payload for job artifact update"""
    job_id: str
    stage: str
    artifact_type: str
    artifact_data: Dict[str, Any]
    
class JobCompletedPayload(BaseModel):
    """Payload for job completion"""
    job_id: str
    repository_path: str
    processing_time: Optional[int] = None
    
class JobErrorPayload(BaseModel):
    """Payload for job error"""
    job_id: str
    error: str
    stage: Optional[str] = None
    
class ChatMessagePayload(BaseModel):
    """Payload for chat message"""
    message: str
    type: Literal["user", "agent", "system"]
    job_id: Optional[str] = None
    
class AgentStatusPayload(BaseModel):
    """Payload for agent status update"""
    agent: str
    status: Literal["idle", "processing", "completed"]
    progress: int
    current_task: Optional[str] = None
    
class AgentLogPayload(BaseModel):
    """Payload for agent log message"""
    agent: str
    message: str
    level: Literal["info", "warning", "error"] = "info"
    
class ConnectionPayload(BaseModel):
    """Payload for connection events"""
    job_id: Optional[str] = None
    message: Optional[str] = None
    
class ErrorPayload(BaseModel):
    """Payload for error messages"""
    message: str
    code: Optional[str] = None