"""
Comprehensive test suite for PennyPilot unified storage abstraction (Local + Cloudflare R2).
Tests:
1. Local filesystem storage behavior (save, get, delete, exists).
2. Cloudflare R2 storage behavior (with S3-mocked client).
3. Receipt upload, retrieval, and deletion.
4. Avatar upload, replacement, and deletion.
5. Cross-user isolation and path traversal protection.
6. Missing objects and error resilience.
7. Missing credentials error handling.
"""
import io
import pytest
from unittest.mock import MagicMock
from pathlib import Path

from app.services.storage import (
    LocalStorageProvider,
    R2StorageProvider,
    sanitize_key,
    receipt_storage_key,
    avatar_storage_key,
)


def test_sanitize_key_prevents_path_traversal():
    """Verify that dangerous path traversal sequences and characters are sanitized."""
    assert sanitize_key("../../../etc/passwd") == "etc/passwd"
    assert sanitize_key("receipts/../user/file.png") == "receipts/user/file.png"
    assert sanitize_key("avatars/user123/..\\..\\malicious.jpg") == "avatars/user123/malicious.jpg"
    assert sanitize_key("/receipts/user/doc.pdf/") == "receipts/user/doc.pdf"


def test_deterministic_key_helpers():
    """Verify receipt and avatar deterministic keys follow user-isolated format."""
    uid = "515638d8-4430-4c18-8dfd-240ee5654570"
    r_key = receipt_storage_key(uid, "abcdef123456", ".jpg")
    assert r_key == f"receipts/{uid}/abcdef123456.jpg"

    a_key = avatar_storage_key(uid, "avatar_123.png")
    assert a_key == f"avatars/{uid}/avatar_123.png"


def test_local_storage_crud(tmp_path):
    """Verify save, get, delete, and exists in LocalStorageProvider."""
    storage = LocalStorageProvider(base_dir=tmp_path)
    test_key = "receipts/user1/test_receipt.png"
    test_data = b"dummy_png_bytes_12345"

    # 1. Save
    saved_key = storage.save_file(test_key, test_data, "image/png")
    assert saved_key == test_key
    assert storage.file_exists(test_key) is True

    # 2. Get
    retrieved = storage.get_file(test_key)
    assert retrieved is not None
    data, mime = retrieved
    assert data == test_data
    assert "image/png" in mime

    # 3. Non-existent file
    assert storage.get_file("receipts/user1/non_existent.pdf") is None
    assert storage.file_exists("receipts/user1/non_existent.pdf") is False

    # 4. Delete
    assert storage.delete_file(test_key) is True
    assert storage.file_exists(test_key) is False
    assert storage.get_file(test_key) is None


def test_r2_storage_missing_credentials():
    """Verify that R2StorageProvider raises a clear ValueError if credentials are not configured."""
    storage = R2StorageProvider(
        account_id="",
        access_key_id="",
        secret_access_key="",
        endpoint_url="",
    )
    with pytest.raises(ValueError, match="required credentials"):
        storage.save_file("receipts/u1/file.png", b"data")


def test_r2_storage_with_mocked_s3():
    """Verify R2 storage operations with an injected mock S3 client."""
    mock_s3 = MagicMock()
    stored_objects = {}

    def mock_put_object(Bucket, Key, Body, ContentType):
        stored_objects[Key] = {"body": Body, "content_type": ContentType}
        return {"ETag": "dummy-etag"}

    def mock_get_object(Bucket, Key):
        if Key not in stored_objects:
            from botocore.exceptions import ClientError
            raise ClientError({"Error": {"Code": "NoSuchKey", "Message": "The specified key does not exist."}}, "GetObject")
        return {
            "Body": io.BytesIO(stored_objects[Key]["body"]),
            "ContentType": stored_objects[Key]["content_type"],
        }

    def mock_head_object(Bucket, Key):
        if Key not in stored_objects:
            from botocore.exceptions import ClientError
            raise ClientError({"Error": {"Code": "404"}}, "HeadObject")
        return {"ContentLength": len(stored_objects[Key]["body"])}

    def mock_delete_object(Bucket, Key):
        stored_objects.pop(Key, None)
        return {"DeleteMarker": True}

    mock_s3.put_object.side_effect = mock_put_object
    mock_s3.get_object.side_effect = mock_get_object
    mock_s3.head_object.side_effect = mock_head_object
    mock_s3.delete_object.side_effect = mock_delete_object

    r2 = R2StorageProvider(
        account_id="test_acc",
        access_key_id="test_key",
        secret_access_key="test_secret",
        bucket_name="pennypilot-test-bucket",
        s3_client=mock_s3,
    )

    # 1. Receipt upload to R2
    uid = "user_alpha"
    file_id = "receipt_999"
    r_key = receipt_storage_key(uid, file_id, ".jpg")
    content = b"receipt_image_binary_content"

    saved = r2.save_file(r_key, content, "image/jpeg")
    assert saved == r_key
    assert r2.file_exists(r_key) is True

    # 2. Receipt retrieval from R2
    res = r2.get_file(r_key)
    assert res is not None
    data, mime = res
    assert data == content
    assert mime == "image/jpeg"

    # 3. Avatar upload & replacement
    a_key_1 = avatar_storage_key(uid, "avatar_v1.png")
    r2.save_file(a_key_1, b"avatar_v1", "image/png")
    assert r2.file_exists(a_key_1) is True

    # Replace avatar (delete old, save new)
    r2.delete_file(a_key_1)
    assert r2.file_exists(a_key_1) is False
    a_key_2 = avatar_storage_key(uid, "avatar_v2.png")
    r2.save_file(a_key_2, b"avatar_v2", "image/png")
    assert r2.file_exists(a_key_2) is True

    # 4. Multi-tenant isolation (User Beta cannot read User Alpha's key)
    beta_uid = "user_beta"
    beta_key = receipt_storage_key(beta_uid, file_id, ".jpg")
    assert r2.get_file(beta_key) is None
    assert r2.file_exists(beta_key) is False

    # 5. Receipt deletion
    assert r2.delete_file(r_key) is True
    assert r2.get_file(r_key) is None
    assert r2.file_exists(r_key) is False
