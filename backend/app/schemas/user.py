"""User and authentication schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=100)
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    display_name: str
    timezone: str
    currency: str
    avatar_url: Optional[str] = None
    email_verified: bool = False
    onboarding_completed: bool = False
    tutorial_completed: bool = False
    monthly_savings_target_paise: Optional[int] = None
    has_password: bool = True
    linked_providers: List[str] = Field(default_factory=list)
    created_at: datetime

    @field_validator("avatar_url", mode="before")
    @classmethod
    def format_avatar_url(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        if v.startswith("/api/v1"):
            return v
        return "/api/v1/auth/me/avatar"


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=2, max_length=100)
    timezone: Optional[str] = Field(None, max_length=50)
    currency: Optional[str] = Field(None, max_length=10)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterResponse(BaseModel):
    user: UserResponse
    message: str = "Account created successfully. A verification link has been sent to your email address."
    email_verification_required: bool = True
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    smtp_configured: bool = True
    email_dispatched: bool = False


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1, max_length=256)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)


class StatusResponse(BaseModel):
    status: str = "ok"
    message: str


class DeleteAccountRequest(BaseModel):
    confirmation_phrase: str
    password: Optional[str] = None

