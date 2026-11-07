"""Pydantic v2 schemas for notifications."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: str
    category: str
    title: str
    message: str
    link_path: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    unread_count: int
    notifications: List[NotificationResponse]

    model_config = ConfigDict(from_attributes=True)
