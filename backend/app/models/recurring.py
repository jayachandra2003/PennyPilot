"""Recurring transaction database model."""
import uuid
from datetime import date
from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class RecurringTransaction(Base, TimestampMixin):
    __tablename__ = "recurring_transactions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)  # Integer paise (>0)
    cadence: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False)  # monthly | weekly
    next_due: Mapped[date] = mapped_column(Date, nullable=False)
    detected_or_manual: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="recurring_rules")
    category = relationship("Category")
