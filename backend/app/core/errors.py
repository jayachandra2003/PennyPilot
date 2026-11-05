"""Centralized error handling and standardized API error shapes."""
from typing import Any, Dict, List, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel
from app.core.logging import logger


class FieldError(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    field_errors: Optional[List[FieldError]] = None


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        field_errors: Optional[List[FieldError]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.field_errors = field_errors
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(message=message, code=code, status_code=status.HTTP_404_NOT_FOUND)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized", code: str = "UNAUTHORIZED"):
        super().__init__(message=message, code=code, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Permission denied", code: str = "FORBIDDEN"):
        super().__init__(message=message, code=code, status_code=status.HTTP_403_FORBIDDEN)


class BadRequestException(AppException):
    def __init__(
        self,
        message: str = "Bad request",
        code: str = "BAD_REQUEST",
        field_errors: Optional[List[FieldError]] = None,
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_400_BAD_REQUEST,
            field_errors=field_errors,
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            code=exc.code,
            message=exc.message,
            field_errors=exc.field_errors,
        ).model_dump(exclude_none=True),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    field_errors = []
    for err in exc.errors():
        field_path = " -> ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        field_errors.append(FieldError(field=field_path, message=msg))

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            code="VALIDATION_ERROR",
            message="Request input validation failed",
            field_errors=field_errors,
        ).model_dump(),
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        429: "RATE_LIMIT_EXCEEDED",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    headers = getattr(exc, "headers", None)
    
    # If detail is dict, format cleanly
    msg = exc.detail
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        msg = exc.detail["error"].get("message", str(exc.detail))
        code = exc.detail["error"].get("code", code)

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(code=code, message=str(msg)).model_dump(
            exclude_none=True
        ),
        headers=headers,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Mask internal exception details in production to prevent information leakage."""
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please try again later.",
        ).model_dump(exclude_none=True),
    )
