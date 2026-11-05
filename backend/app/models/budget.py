"""Budget database model."""
import uuid
from datetime import date
from typing import Optional
from sqlalchemy import BigInteger, Date, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

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
    # category_id is nullable: None represents overall total monthly budget
    category_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=True,
    )
    month: Mapped[date] = mapped_column(Date, nullable=False)  # Normalized to 1st of month (YYYY-MM-01)
    limit_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)  # Limit in integer paise

    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint("user_id", "category_id", "month", name="uq_user_category_month_budget"),
        Index("ix_budget_user_month", "user_id", "month"),
    )
