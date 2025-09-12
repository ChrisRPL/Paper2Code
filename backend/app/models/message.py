"""
Message model for chat functionality
"""

from sqlalchemy import Column, String, DateTime, Text, Enum as SQLAEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from ..core.database import Base

class MessageType(str, enum.Enum):
    """Chat message types"""
    USER = "user"
    AGENT = "agent" 
    SYSTEM = "system"

class Message(Base):
    """
    Message model for chat functionality
    """
    __tablename__ = "messages"
    
    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Message content
    content = Column(Text, nullable=False)
    type = Column(SQLAEnum(MessageType), nullable=False)
    
    # Relationships
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True) 
    
    # Metadata
    stage = Column(String, nullable=True)  # Which processing stage this message relates to
    metadata = Column(Text, nullable=True)  # JSON string for additional metadata
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Message(id={self.id}, type={self.type}, job_id={self.job_id})>"