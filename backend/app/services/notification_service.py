"""Notification service for creating, managing, and synchronizing user notifications."""
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.notification import Notification
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.category import Category
from app.domain.timezone import today_ist, get_month_boundaries
from app.domain.currency import format_inr


def create_notification(
    db: Session,
    user_id: str,
    category: str,
    title: str,
    message: str,
    link_path: Optional[str] = None,
    dedup_hours: int = 24,
) -> Optional[Notification]:
    """Create a persistent user notification, suppressing duplicates within dedup_hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=dedup_hours)
    existing = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.category == category,
            Notification.title == title,
            Notification.created_at >= cutoff,
        )
        .first()
    )
    if existing:
        return existing

    notif = Notification(
        user_id=user_id,
        category=category,
        title=title,
        message=message,
        link_path=link_path,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def sync_dynamic_financial_notifications(db: Session, user_id: str) -> None:
    """Evaluate deterministic financial events and generate real notifications if thresholds are met."""
    now = today_ist()
    start_date, end_date, _ = get_month_boundaries(now.year, now.month)

    # 1. Check if user is brand new with zero transactions
    total_tx_count = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
        .scalar()
        or 0
    )
    if total_tx_count == 0:
        create_notification(
            db=db,
            user_id=user_id,
            category="tip",
            title="Getting Started with PennyPilot",
            message="Welcome to your financial ledger! Click Quick Add or Record Income to build your financial intelligence.",
            link_path="/",
            dedup_hours=168,  # Once per week
        )
        return

    # 2. Check budget utilization for active budgets
    first_of_month = date(now.year, now.month, 1)
    budgets = (
        db.query(Budget, Category.name.label("category_name"))
        .join(Category, Budget.category_id == Category.id)
        .filter(
            Budget.user_id == user_id,
            Budget.month == first_of_month,
        )
        .all()
    )

    for b, cat_name in budgets:
        if b.limit_paise <= 0:
            continue

        spent_paise = (
            db.query(func.coalesce(func.sum(Transaction.amount_paise), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category_id == b.category_id,
                Transaction.kind == "expense",
                Transaction.deleted_at.is_(None),
                Transaction.occurred_on >= start_date,
                Transaction.occurred_on <= end_date,
            )
            .scalar()
            or 0
        )

        pct = (spent_paise / b.limit_paise) * 100.0
        if pct >= 100.0:
            overrun_paise = spent_paise - b.limit_paise
            create_notification(
                db=db,
                user_id=user_id,
                category="alert",
                title=f"Budget Exceeded: {cat_name}",
                message=f"You have spent {format_inr(spent_paise)} ({pct:.1f}% of ceiling), exceeding your limit by {format_inr(overrun_paise)}.",
                link_path="/budgets",
                dedup_hours=48,
            )
        elif pct >= 85.0:
            create_notification(
                db=db,
                user_id=user_id,
                category="financial",
                title=f"Budget Caution: {cat_name}",
                message=f"You have reached {pct:.1f}% of your allocated limit for {cat_name} ({format_inr(spent_paise)} spent).",
                link_path="/budgets",
                dedup_hours=48,
            )


def get_user_notifications(db: Session, user_id: str, limit: int = 50) -> Tuple[List[Notification], int]:
    """Retrieve all user notifications with unread count, synchronizing dynamic events."""
    sync_dynamic_financial_notifications(db, user_id)

    items = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    unread_count = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .scalar()
        or 0
    )
    return items, unread_count


def mark_notification_as_read(db: Session, user_id: str, notification_id: str) -> Optional[Notification]:
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif


def mark_all_notifications_as_read(db: Session, user_id: str) -> int:
    """Mark all notifications as read for a user."""
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated


def delete_notification(db: Session, user_id: str, notification_id: str) -> bool:
    """Delete / dismiss a single notification."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if notif:
        db.delete(notif)
        db.commit()
        return True
    return False
