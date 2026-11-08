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


# ─── Supabase S3-compatible storage tests ───────────────────────────────────

def test_r2_provider_stores_region_parameter():
    """R2StorageProvider stores the region parameter correctly and defaults to 'auto'."""
    # Supabase mode — explicit region
    p = R2StorageProvider(
        access_key_id="ak",
        secret_access_key="sk",
        endpoint_url="https://xyz.supabase.co/storage/v1/s3",
        region="ap-southeast-1",
    )
    assert p.region == "ap-southeast-1"

    # R2 mode — default region (backward compatible)
    p2 = R2StorageProvider(
        account_id="myaccount",
        access_key_id="ak",
        secret_access_key="sk",
    )
    assert p2.region == "auto"


def test_r2_provider_endpoint_url_overrides_account_id():
    """When endpoint_url is explicitly set it overrides the account_id-derived endpoint."""
    p = R2StorageProvider(
        account_id="should-be-ignored",
        access_key_id="ak",
        secret_access_key="sk",
        endpoint_url="https://xyz.supabase.co/storage/v1/s3",
    )
    assert p.endpoint_url == "https://xyz.supabase.co/storage/v1/s3"
    assert "should-be-ignored" not in p.endpoint_url


def _make_supabase_mock_provider(bucket="pennypilot-storage") -> R2StorageProvider:
    """Factory: R2StorageProvider configured like Supabase S3, with injected mock client."""
    mock_s3 = MagicMock()
    store: dict = {}

    def _put(Bucket, Key, Body, ContentType):
        store[Key] = {"body": Body, "content_type": ContentType}
        return {"ETag": "supabase-etag-abc"}

    def _get(Bucket, Key):
        if Key not in store:
            from botocore.exceptions import ClientError
            raise ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "Not found"}}, "GetObject"
            )
        return {
            "Body": io.BytesIO(store[Key]["body"]),
            "ContentType": store[Key]["content_type"],
        }

    def _head(Bucket, Key):
        if Key not in store:
            from botocore.exceptions import ClientError
            raise ClientError({"Error": {"Code": "404"}}, "HeadObject")
        return {"ContentLength": len(store[Key]["body"])}

    def _delete(Bucket, Key):
        store.pop(Key, None)
        return {}

    mock_s3.put_object.side_effect = _put
    mock_s3.get_object.side_effect = _get
    mock_s3.head_object.side_effect = _head
    mock_s3.delete_object.side_effect = _delete

    return R2StorageProvider(
        access_key_id="supabase-ak-env",
        secret_access_key="supabase-sk-env",
        endpoint_url="https://xyz.supabase.co/storage/v1/s3",
        region="ap-southeast-1",
        bucket_name=bucket,
        s3_client=mock_s3,
    )


def test_supabase_full_crud_cycle():
    """Full save → exists → get → delete cycle using Supabase-configured mock provider."""
    provider = _make_supabase_mock_provider()
    key = receipt_storage_key("user-supabase-abc123", "aabbccdd11223344", ".pdf")

    # Save
    saved = provider.save_file(key, b"%PDF-1.4 test content", "application/pdf")
    assert saved == key

    # Exists
    assert provider.file_exists(key) is True

    # Get
    result = provider.get_file(key)
    assert result is not None
    data, mime = result
    assert data == b"%PDF-1.4 test content"
    assert mime == "application/pdf"

    # Delete
    assert provider.delete_file(key) is True
    assert provider.file_exists(key) is False
    assert provider.get_file(key) is None


def test_supabase_cross_account_receipt_isolation():
    """Alice's receipt key cannot be constructed or retrieved via Bob's user_id."""
    provider = _make_supabase_mock_provider()

    alice_id = "alice-00000000-0000-0000-0000-000000000001"
    bob_id = "bob-00000000-0000-0000-0000-000000000002"
    shared_file_id = "deadbeefdeadbeef0000000011112222"

    alice_key = receipt_storage_key(alice_id, shared_file_id, ".jpg")
    bob_key = receipt_storage_key(bob_id, shared_file_id, ".jpg")

    # Upload as Alice
    provider.save_file(alice_key, b"alice_private_receipt_data", "image/jpeg")

    # Keys are structurally distinct — same file_id, different user prefix
    assert alice_key != bob_key
    assert alice_id in alice_key
    assert alice_id not in bob_key

    # Bob's constructed key returns None — cannot access Alice's object
    assert provider.get_file(bob_key) is None
    assert provider.file_exists(bob_key) is False

    # Alice's key returns her file
    result = provider.get_file(alice_key)
    assert result is not None
    assert result[0] == b"alice_private_receipt_data"


def test_supabase_cross_account_avatar_isolation():
    """Users cannot read or overwrite each other's avatar objects."""
    provider = _make_supabase_mock_provider()

    alice_id = "alice-uuid-aaaa"
    bob_id = "bob-uuid-bbbb"

    alice_av = avatar_storage_key(alice_id, "profile.jpg")
    bob_av = avatar_storage_key(bob_id, "profile.jpg")

    provider.save_file(alice_av, b"alice_avatar_bytes", "image/jpeg")
    provider.save_file(bob_av, b"bob_avatar_bytes", "image/jpeg")

    assert provider.get_file(alice_av)[0] == b"alice_avatar_bytes"
    assert provider.get_file(bob_av)[0] == b"bob_avatar_bytes"
    assert alice_av != bob_av


def test_supabase_missing_object_returns_none():
    """get_file and file_exists return None/False for a key that was never uploaded."""
    provider = _make_supabase_mock_provider()
    missing_key = receipt_storage_key("user-xyz", "nonexistent0000000000000000000000", ".png")

    assert provider.get_file(missing_key) is None
    assert provider.file_exists(missing_key) is False


def test_supabase_missing_credentials_raises_clearly():
    """Verify a clear ValueError when Supabase mode is configured without credentials."""
    p = R2StorageProvider(
        access_key_id="",
        secret_access_key="",
        endpoint_url="",
        region="ap-southeast-1",
    )
    with pytest.raises(ValueError, match="required credentials"):
        p.save_file("some/key.jpg", b"data")


def test_supabase_upload_failure_propagates():
    """If the S3 put_object raises, save_file propagates the exception."""
    from botocore.exceptions import ClientError

    mock_s3 = MagicMock()
    mock_s3.put_object.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}}, "PutObject"
    )

    provider = R2StorageProvider(
        access_key_id="ak",
        secret_access_key="sk",
        endpoint_url="https://xyz.supabase.co/storage/v1/s3",
        region="ap-southeast-1",
        bucket_name="pennypilot-storage",
        s3_client=mock_s3,
    )
    with pytest.raises(ClientError):
        provider.save_file("receipts/u1/file.jpg", b"data", "image/jpeg")


def test_supabase_path_traversal_blocked():
    """Path traversal sequences in storage keys are sanitized before reaching S3."""
    provider = _make_supabase_mock_provider()

    malicious_key = "receipts/../../admin/steal.pdf"
    safe_key = sanitize_key(malicious_key)

    # sanitize_key strips traversal
    assert ".." not in safe_key
    assert safe_key == "receipts/admin/steal.pdf"

    # Upload using malicious key — the provider sanitizes it internally
    provider.save_file(malicious_key, b"payload", "application/pdf")

    # Only the sanitized key exists
    assert provider.file_exists(safe_key) is True
    # Raw traversal path not reachable
    assert provider.file_exists("../../admin/steal.pdf") is False


def test_get_storage_provider_supabase_alias(monkeypatch):
    """get_storage_provider() returns R2StorageProvider for STORAGE_BACKEND='supabase'."""
    import app.services.storage as storage_module
    storage_module._storage_instance = None

    monkeypatch.setattr(storage_module.settings, "STORAGE_BACKEND", "supabase")
    monkeypatch.setattr(storage_module.settings, "R2_ACCESS_KEY_ID", "ak")
    monkeypatch.setattr(storage_module.settings, "R2_SECRET_ACCESS_KEY", "sk")
    monkeypatch.setattr(storage_module.settings, "R2_ENDPOINT_URL", "https://xyz.supabase.co/storage/v1/s3")
    monkeypatch.setattr(storage_module.settings, "R2_REGION", "ap-southeast-1")

    provider = storage_module.get_storage_provider()
    assert isinstance(provider, storage_module.R2StorageProvider)
    assert provider.region == "ap-southeast-1"
    assert provider.endpoint_url == "https://xyz.supabase.co/storage/v1/s3"
    storage_module._storage_instance = None


def test_get_storage_provider_local_unchanged(monkeypatch):
    """'local' backend still returns LocalStorageProvider (no regression)."""
    import app.services.storage as storage_module
    storage_module._storage_instance = None
    monkeypatch.setattr(storage_module.settings, "STORAGE_BACKEND", "local")
    provider = storage_module.get_storage_provider()
    assert isinstance(provider, storage_module.LocalStorageProvider)
    storage_module._storage_instance = None


def test_get_storage_provider_r2_unchanged(monkeypatch):
    """'r2' backend still returns R2StorageProvider with region='auto' (no regression)."""
    import app.services.storage as storage_module
    storage_module._storage_instance = None
    monkeypatch.setattr(storage_module.settings, "STORAGE_BACKEND", "r2")
    monkeypatch.setattr(storage_module.settings, "R2_ACCOUNT_ID", "myaccount")
    monkeypatch.setattr(storage_module.settings, "R2_ACCESS_KEY_ID", "ak")
    monkeypatch.setattr(storage_module.settings, "R2_SECRET_ACCESS_KEY", "sk")
    monkeypatch.setattr(storage_module.settings, "R2_REGION", "auto")
    provider = storage_module.get_storage_provider()
    assert isinstance(provider, storage_module.R2StorageProvider)
    assert provider.region == "auto"
    storage_module._storage_instance = None
