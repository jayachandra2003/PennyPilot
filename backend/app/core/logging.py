"""Structured logging configuration with sensitive data sanitization."""
import logging
import re
import sys
from typing import Any, Dict

SENSITIVE_KEYS = {"password", "secret", "token", "key", "authorization", "cookie"}
SENSITIVE_PATTERN = re.compile(
    r'(?i)(password|secret|token|api_key|authorization)\s*[:=]\s*["\']?([^"\'\s&]+)["\']?'
)


class SensitiveDataFilter(logging.Filter):
    """Filter that scrubs sensitive credentials and API keys from log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = SENSITIVE_PATTERN.sub(r"\1=***", record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = self._sanitize_dict(record.args)
            elif isinstance(record.args, tuple):
                record.args = tuple(self._sanitize_value(v) for v in record.args)
        return True

    def _sanitize_dict(self, d: Dict[str, Any]) -> Dict[str, Any]:
        sanitized = {}
        for k, v in d.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "***"
            elif isinstance(v, dict):
                sanitized[k] = self._sanitize_dict(v)
            else:
                sanitized[k] = self._sanitize_value(v)
        return sanitized

    def _sanitize_value(self, v: Any) -> Any:
        if isinstance(v, str):
            return SENSITIVE_PATTERN.sub(r"\1=***", v)
        return v


def setup_logging(debug: bool = False) -> None:
    """Initialize structured and secure logging for the application."""
    log_level = logging.DEBUG if debug else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers = [handler]

    # Silence overly verbose external loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


logger = logging.getLogger("pennypilot")
