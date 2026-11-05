"""Transaction database model."""
import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

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
        index=True,
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(20), default="expense", nullable=False)  # expense | income
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)  # Stored in integer paise (e.g. ₹100.50 -> 10050)
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    merchant: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)  # manual | nl | csv
    nl_original_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recurring_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("recurring_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # Soft delete

    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    recurring_rule = relationship("RecurringTransaction")

    __table_args__ = (
        Index("ix_tx_user_occurred_on", "user_id", "occurred_on"),
        Index("ix_tx_user_category", "user_id", "category_id", "occurred_on"),
        Index("ix_tx_user_kind", "user_id", "kind", "occurred_on"),
    )
