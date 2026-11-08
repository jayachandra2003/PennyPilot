# PennyPilot — Persistent Storage Architecture Specification
## Avatar & Receipt Object Storage for Vercel Serverless Production

---

## 1. Executive Summary & Ephemeral Storage Problem

On Vercel's Serverless Python runtime, the underlying execution environment is completely ephemeral:
- **Read-Only Root:** The application root directory (`/var/task` or `./`) is read-only.
- **Temporary Scratch (`/tmp`):** Writing is permitted exclusively in `/tmp` (up to 512 MB).
- **Container Recycling:** Any files written to `/tmp/uploads/avatars` or `/tmp/uploads/receipts` persist **only for the lifespan of that specific warm lambda container**. When the instance goes idle or a request hits a newly spun-up container instance, `/tmp` is completely fresh.
- **User Impact:** 
  - Transaction and budget records remain 100% safe in Neon PostgreSQL.
  - In-memory receipt OCR text extraction during upload succeeds seamlessly.
  - However, subsequent raw file requests (e.g., `GET /api/v1/receipts/file/{file_id}` to view the original receipt image, or `GET /api/v1/auth/me/avatar` to display a user's profile avatar) return HTTP 404 once the container is recycled.

---

## 2. Recommended Storage Provider: Cloudflare R2

To maintain PennyPilot's **$0 Budget Constitution** without paying egress or hosting fees, **Cloudflare R2** is the recommended persistent object storage solution:

| Feature | Cloudflare R2 | AWS S3 | Supabase Storage | Vercel Blob |
| :--- | :--- | :--- | :--- | :--- |
| **Free Storage** | **10 GB / month ($0)** | 5 GB (1st year only) | 1 GB / month ($0) | 1 GB / month ($0) |
| **Egress / Bandwidth Fees** | **$0 (Zero Egress Fees)** | ~$0.09 / GB | Bandwidth capped | ~$0.15 / GB over quota |
| **API Protocol** | **Standard S3-Compatible** | AWS S3 | S3-Compatible | Proprietary REST |
| **Python Ecosystem Support** | **Standard (`boto3` / `httpx`)**| Standard | Standard | Node-centric |
| **Zero-Budget Alignment** | **100% Perfect ($0 forever)**| Expires after 12 mos | Limited (1 GB) | Card required for scale |

---

## 3. Storage Architecture & Minimal Code Changes

To preserve 100% of existing frontend and backend API contracts, the system introduces a **Modular Storage Provider Interface**:

```
                       ┌─────────────────────────────────────────┐
                       │          Incoming API Request           │
                       │   (/receipts/extract, /me/avatar, etc.) │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │       Abstract StorageProvider          │
                       │   (save_file, get_file, delete_file)   │
                       └────────────────────┬────────────────────┘
                                            │
                       ┌────────────────────┴────────────────────┐
                       ▼                                         ▼
         ┌───────────────────────────┐             ┌───────────────────────────┐
         │    LocalStorageProvider   │             │      S3StorageProvider    │
         │ (STORAGE_BACKEND="local") │             │  (STORAGE_BACKEND="r2")   │
         │   Local Disk / /tmp       │             │ Cloudflare R2 / AWS S3    │
         └───────────────────────────┘             └───────────────────────────┘
```

### 3.1. Abstract Interface (`backend/app/services/storage.py`)
```python
from abc import ABC, abstractmethod
from typing import Optional, Tuple

class StorageProvider(ABC):
    @abstractmethod
    def save_file(self, key: str, data: bytes, content_type: str) -> str:
        """Saves file bytes and returns storage key / identifier."""
        pass

    @abstractmethod
    def get_file(self, key: str) -> Optional[Tuple[bytes, str]]:
        """Retrieves file bytes and content type."""
        pass

    @abstractmethod
    def delete_file(self, key: str) -> bool:
        """Deletes file by key."""
        pass
```

### 3.2. Preservation of Existing API Endpoints
All existing API routes retain identical parameters, signatures, and responses:
1. `POST /api/v1/receipts/extract`:
   - Validates file size ($\le 5\text{MB}$) and magic bytes in memory.
   - Saves file bytes via `storage_provider.save_file(f"receipts/{user_id}/{file_id}{ext}", content, mime_type)`.
   - Runs OCR / Gemini Vision extraction on the in-memory bytes.
   - Returns structured draft response to frontend.
2. `GET /api/v1/receipts/file/{file_id}`:
   - Fetches file bytes from `storage_provider.get_file(...)`.
   - Returns standard `Response(content=file_bytes, media_type=mime_type)` or signed S3 download URL.
3. `DELETE /api/v1/receipts/file/{file_id}`:
   - Deletes object via `storage_provider.delete_file(...)`.
4. `POST /api/v1/auth/me/avatar` & `GET /api/v1/auth/me/avatar`:
   - Stores and retrieves avatars under key `avatars/{user_id}/{filename}`.

---

## 4. Production Environment Configuration

When ready to enable persistent Cloudflare R2 storage, add these variables to Vercel:

```ini
STORAGE_BACKEND=r2
S3_ENDPOINT_URL=https://<your-cloudflare-account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<your-r2-access-key-id>
S3_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
S3_BUCKET_NAME=pennypilot-production
```

If `STORAGE_BACKEND` is omitted or set to `local`, PennyPilot continues to use local filesystem storage (`/tmp` on serverless, `./uploads` on localhost).
