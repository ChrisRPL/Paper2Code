"""
Custom middleware: request ID injection and simple rate limiter
"""

import time
import uuid
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings
from .errors import RateLimitExceededError


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class SimpleRateLimiter(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.calls: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path
        method = request.method
        # Only limit selected routes
        limited_paths = settings.RATE_LIMIT_PATHS or ["/api/v1/upload"]
        if not any(path.startswith(p) for p in limited_paths):
            return await call_next(request)

        # Identify client (IP)
        ip = request.client.host if request.client else "unknown"
        key = (ip, path)
        now = time.time()
        window = settings.RATE_LIMIT_WINDOW_SECONDS
        max_calls = settings.RATE_LIMIT_MAX_REQUESTS

        q = self.calls[key]
        # purge old
        while q and (now - q[0]) > window:
            q.popleft()
        if len(q) >= max_calls:
            raise RateLimitExceededError()
        q.append(now)
        return await call_next(request)
