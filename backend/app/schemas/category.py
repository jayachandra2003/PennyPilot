"""Category schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: str = Field(pattern="^(expense|income)$", default="expense")
    icon: str = "tag"
    color_token: str = "teal"
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color_token: Optional[str] = None
    is_archived: Optional[bool] = None
    sort_order: Optional[int] = None


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    is_archived: bool
    created_at: datetime
    transaction_count: int = 0
    has_active_budget: bool = False
    is_default: bool = False

