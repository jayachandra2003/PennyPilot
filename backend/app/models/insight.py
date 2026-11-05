"""Insight database model for explainable, deterministic intelligence."""
import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Insight(Base, TimestampMixin):
    __tablename__ = "insights"

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
    month: Mapped[date] = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # budget_pace | anomaly | category_shift | recurring
    severity: Mapped[str] = mapped_column(String(20), default="info", nullable=False)  # info | warning | alert
    facts_json: Mapped[str] = mapped_column(Text, nullable=False)  # Deterministic JSON fact bundle
    template_text: Mapped[str] = mapped_column(Text, nullable=False)  # Guaranteed rule-based sentence
    ai_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Optional LLM narration
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        Index("ix_insight_user_month", "user_id", "month"),
    )
