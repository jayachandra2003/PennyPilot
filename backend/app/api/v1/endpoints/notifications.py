"""Endpoints for user notification management."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification_service import (
    get_user_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    delete_notification,
)

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all notifications for current authenticated user with unread count."""
    items, unread_count = get_user_notifications(db, current_user.id)
    return NotificationListResponse(
        unread_count=unread_count,
        notifications=[NotificationResponse.model_validate(n) for n in items],
    )


@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_read(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = mark_notification_as_read(db, current_user.id, id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return NotificationResponse.model_validate(notif)


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for current user."""
    updated = mark_all_notifications_as_read(db, current_user.id)
    return {"message": "All notifications marked as read", "updated_count": updated}


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_notification(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dismiss and delete a notification."""
    success = delete_notification(db, current_user.id, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return None
