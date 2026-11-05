"""Financial Goal database model."""
import uuid
from datetime import date
from sqlalchemy import BigInteger, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class FinancialGoal(Base, TimestampMixin):
    __tablename__ = "financial_goals"

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
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    target_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    saved_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # Relationships
    user = relationship("User", back_populates="goals")
