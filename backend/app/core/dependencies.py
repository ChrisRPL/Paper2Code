"""
FastAPI dependency injection for services
"""

from functools import lru_cache
from ..services.file_manager import FileManagerService
from ..services.job_tracker import JobTrackerService
from ..services.websocket_manager import WebSocketManagerService
from ..integration.paper_coder_wrapper import Paper2CodeWrapper


@lru_cache()
def get_file_manager() -> FileManagerService:
    """Get file manager service instance"""
    return FileManagerService()


@lru_cache()
def get_job_tracker() -> JobTrackerService:
    """Get job tracker service instance"""
    return JobTrackerService()


@lru_cache()
def get_websocket_manager() -> WebSocketManagerService:
    """Get websocket manager service instance"""
    return WebSocketManagerService()


def get_paper_coder_wrapper() -> Paper2CodeWrapper:
    """Get paper coder wrapper instance"""
    websocket_manager = get_websocket_manager()
    return Paper2CodeWrapper(websocket_manager)