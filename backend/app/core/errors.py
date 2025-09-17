"""
Centralized error handling utilities and exception classes
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Optional
import uuid

from .config import settings


class AppError(Exception):
    def __init__(self, detail: str, status_code: int = 500, error_code: Optional[str] = None):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code


class ServiceUnavailableError(AppError):
    def __init__(self, detail: str = "Service temporarily unavailable"):
        super().__init__(detail=detail, status_code=503, error_code="SERVICE_UNAVAILABLE")


class RateLimitExceededError(AppError):
    def __init__(self, detail: str = "Rate limit exceeded. Please try again later."):
        super().__init__(detail=detail, status_code=429, error_code="RATE_LIMIT_EXCEEDED")


def _build_error_body(detail: str, request_id: Optional[str] = None, error_code: Optional[str] = None, status_code: int = 500):
    body = {"detail": detail}
    include_meta = settings.DEBUG or status_code >= 500
    if include_meta:
        if error_code:
            body["error_code"] = error_code
        if request_id:
            body["request_id"] = request_id
    return body


def register_exception_handlers(app):
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        rid = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_body(exc.detail, rid, exc.error_code, exc.status_code),
            headers={"X-Request-ID": rid} if rid else None,
        )

    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException):
        rid = getattr(request.state, "request_id", None)
        detail = exc.detail if isinstance(exc.detail, str) else "HTTP error"
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_body(detail, rid, None, exc.status_code),
            headers={"X-Request-ID": rid} if rid else None,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        rid = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=422,
            content=_build_error_body("Validation error", rid, "VALIDATION_ERROR", 422),
            headers={"X-Request-ID": rid} if rid else None,
        )

    @app.exception_handler(Exception)
    async def handle_generic_exception(request: Request, exc: Exception):
        rid = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=500,
            content=_build_error_body("Internal server error", rid, "INTERNAL_SERVER_ERROR", 500),
            headers={"X-Request-ID": rid} if rid else None,
        )
