"""
PennyPilot — Unified Storage Provider Abstraction.
Supports:
1. LocalStorageProvider: Zero-configuration local disk / /tmp storage for development.
2. R2StorageProvider: Cloudflare R2 (S3-compatible) zero-cost persistent object storage for production.
"""
import io
import mimetypes
import os
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Optional, Tuple

from app.core.config import PROJECT_ROOT, settings
from app.core.logging import logger


class StorageProvider(ABC):
    """Abstract interface for file persistence."""

    @abstractmethod
    def save_file(self, key: str, data: bytes, content_type: Optional[str] = None) -> str:
        """Persist file bytes under storage key. Returns key."""
        pass

    @abstractmethod
    def get_file(self, key: str) -> Optional[Tuple[bytes, str]]:
        """Retrieve file bytes and content-type by key. Returns None if not found."""
        pass

    @abstractmethod
    def delete_file(self, key: str) -> bool:
        """Remove file by key. Returns True if deleted or did not exist."""
        pass

    @abstractmethod
    def file_exists(self, key: str) -> bool:
        """Check if file exists by key."""
        pass


def sanitize_key(key: str) -> str:
    """Prevent path traversal and normalize key separators."""
    # Normalize slashes and strip leading/trailing slashes
    clean = key.replace("\\", "/").strip("/")
    parts = clean.split("/")
    safe_parts = []
    for p in parts:
        if p in ("", ".", ".."):
            continue
        # Strip dangerous characters
        safe_p = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", p)
        if safe_p:
            safe_parts.append(safe_p)
    return "/".join(safe_parts)


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider for development and testing."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = (base_dir or PROJECT_ROOT / "uploads").resolve()
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            self.base_dir = Path("/tmp/uploads").resolve()
            self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, key: str) -> Path:
        safe_k = sanitize_key(key)
        target = (self.base_dir / safe_k).resolve()
        if not str(target).startswith(str(self.base_dir)):
            raise ValueError(f"Path traversal detected for storage key: {key}")
        return target

    def save_file(self, key: str, data: bytes, content_type: Optional[str] = None) -> str:
        path = self._resolve_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return sanitize_key(key)

    def get_file(self, key: str) -> Optional[Tuple[bytes, str]]:
        try:
            path = self._resolve_path(key)
            if not path.is_file():
                return None
            with open(path, "rb") as f:
                data = f.read()
            mime, _ = mimetypes.guess_type(str(path))
            return data, mime or "application/octet-stream"
        except Exception as e:
            logger.warning(f"LocalStorageProvider.get_file failed for {key}: {e}")
            return None

    def delete_file(self, key: str) -> bool:
        try:
            path = self._resolve_path(key)
            if path.is_file():
                path.unlink(missing_ok=True)
            return True
        except Exception as e:
            logger.warning(f"LocalStorageProvider.delete_file failed for {key}: {e}")
            return False

    def file_exists(self, key: str) -> bool:
        try:
            path = self._resolve_path(key)
            return path.is_file()
        except Exception:
            return False


class R2StorageProvider(StorageProvider):
    """Cloudflare R2 (S3-compatible) persistent object storage provider."""

    def __init__(
        self,
        account_id: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        s3_client: Optional[Any] = None,
    ):
        self.account_id = account_id or getattr(settings, "R2_ACCOUNT_ID", "")
        self.access_key_id = access_key_id or getattr(settings, "R2_ACCESS_KEY_ID", "")
        self.secret_access_key = secret_access_key or getattr(settings, "R2_SECRET_ACCESS_KEY", "")
        self.bucket_name = bucket_name or getattr(settings, "R2_BUCKET_NAME", "pennypilot-storage")
        
        # Build endpoint if not explicitly provided
        if endpoint_url:
            self.endpoint_url = endpoint_url
        elif self.account_id:
            self.endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        else:
            self.endpoint_url = getattr(settings, "R2_ENDPOINT_URL", "")

        # Optional dependency injection of s3_client (allows mock clients in tests)
        if s3_client is not None:
            self._client = s3_client
        else:
            self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        
        if not (self.access_key_id and self.secret_access_key and self.endpoint_url):
            raise ValueError(
                "Cloudflare R2 is configured as STORAGE_BACKEND, but required credentials "
                "(R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID or R2_ENDPOINT_URL) are missing."
            )

        try:
            import boto3
            from botocore.config import Config
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name="auto",
                config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
            )
            return self._client
        except ImportError:
            raise ImportError("boto3 is required for Cloudflare R2 storage. Run: pip install boto3")

    def save_file(self, key: str, data: bytes, content_type: Optional[str] = None) -> str:
        safe_k = sanitize_key(key)
        client = self._get_client()
        mime = content_type or mimetypes.guess_type(safe_k)[0] or "application/octet-stream"
        
        client.put_object(
            Bucket=self.bucket_name,
            Key=safe_k,
            Body=data,
            ContentType=mime,
        )
        return safe_k

    def get_file(self, key: str) -> Optional[Tuple[bytes, str]]:
        safe_k = sanitize_key(key)
        client = self._get_client()
        try:
            resp = client.get_object(Bucket=self.bucket_name, Key=safe_k)
            body = resp["Body"].read()
            content_type = resp.get("ContentType") or mimetypes.guess_type(safe_k)[0] or "application/octet-stream"
            return body, content_type
        except Exception as e:
            # Check for 404 / NoSuchKey
            err_code = getattr(e, "response", {}).get("Error", {}).get("Code", "")
            if err_code in ("NoSuchKey", "404", "NotFound"):
                return None
            logger.warning(f"R2StorageProvider.get_file error for {safe_k}: {e}")
            return None

    def delete_file(self, key: str) -> bool:
        safe_k = sanitize_key(key)
        client = self._get_client()
        try:
            client.delete_object(Bucket=self.bucket_name, Key=safe_k)
            return True
        except Exception as e:
            logger.warning(f"R2StorageProvider.delete_file error for {safe_k}: {e}")
            return False

    def file_exists(self, key: str) -> bool:
        safe_k = sanitize_key(key)
        client = self._get_client()
        try:
            client.head_object(Bucket=self.bucket_name, Key=safe_k)
            return True
        except Exception:
            return False


# Singleton Storage Provider Factory
_storage_instance: Optional[StorageProvider] = None


def get_storage_provider() -> StorageProvider:
    """Return configured StorageProvider singleton based on STORAGE_BACKEND setting."""
    global _storage_instance
    if _storage_instance is None:
        backend = getattr(settings, "STORAGE_BACKEND", "local").strip().lower()
        if backend == "r2":
            _storage_instance = R2StorageProvider()
        else:
            _storage_instance = LocalStorageProvider()
    return _storage_instance


def reset_storage_provider() -> None:
    """Reset storage provider singleton (used in test fixtures)."""
    global _storage_instance
    _storage_instance = None


def receipt_storage_key(user_id: str, file_id: str, ext: str) -> str:
    """Standardized deterministic path for receipt files."""
    clean_ext = ext if ext.startswith(".") else f".{ext}"
    return f"receipts/{user_id}/{file_id}{clean_ext}"


def avatar_storage_key(user_id: str, filename: str) -> str:
    """Standardized deterministic path for avatar files."""
    return f"avatars/{user_id}/{filename}"
