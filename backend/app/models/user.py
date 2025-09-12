"""
User model for session management (optional for MVP)
"""

from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
import uuid

from ..core.database import Base

class User(Base):
    """
    User model for session management and job history
    Note: This is optional for MVP - can be used for future features
    """
    __tablename__ = "users"
    
    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Session information
    session_id = Column(String, unique=True, nullable=True)  # Browser session ID
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Optional user information (for future features)
    email = Column(String, nullable=True)
    name = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, session_id={self.session_id})>"