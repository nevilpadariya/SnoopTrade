from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator

from services.auth_services import decode_access_token
from services.notifications_service import (
    get_notification_preferences,
    list_dispatch_log,
    register_push_token,
    remove_push_token,
    send_daily_digest_for_user,
    send_test_notification_for_user,
    update_notification_preferences,
)
from utils.limiter import limiter

notification_router = APIRouter(prefix="/notifications")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


class NotificationPreferencesOut(BaseModel):
    user_email: str
    email_enabled: bool
    webhook_enabled: bool
    webhook_url: str | None = None
    push_enabled: bool
    daily_digest_enabled: bool
    digest_hour_local: int = Field(ge=0, le=23)
    timezone: str
    min_severity: Literal["low", "medium", "high"]
    last_digest_local_date: str | None = None
    created_at: str
    updated_at: str


class NotificationPreferencesUpdate(BaseModel):
    email_enabled: bool | None = None
    webhook_enabled: bool | None = None
    webhook_url: str | None = Field(default=None, max_length=1024)
    push_enabled: bool | None = None
    daily_digest_enabled: bool | None = None
    digest_hour_local: int | None = Field(default=None, ge=0, le=23)
    timezone: str | None = Field(default=None, max_length=64)
    min_severity: Literal["low", "medium", "high"] | None = None


class PushTokenRequest(BaseModel):
    token: str = Field(min_length=12, max_length=512)
    platform: str = Field(default="unknown", min_length=2, max_length=20)

    @field_validator("token")
    @classmethod
    def normalize_token(cls, value: str) -> str:
        return value.strip()

    @field_validator("platform")
    @classmethod
    def normalize_platform(cls, value: str) -> str:
        return value.strip().lower()


class NotificationDispatchItem(BaseModel):
    id: str
    channel: str
    kind: str
    success: bool
    reason: str
    created_at: str


class NotificationActionResponse(BaseModel):
    status: str
    reason: str | None = None
    attempted: int | None = None
    sent: int | None = None
    event_count: int | None = None


def _get_user_email(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication payload")
    return email


@notification_router.get("/preferences", response_model=NotificationPreferencesOut)
@limiter.limit("120/minute")
def read_notification_preferences(
    request: Request,
    user_email: str = Depends(_get_user_email),
) -> NotificationPreferencesOut:
    prefs = get_notification_preferences(user_email)
    return NotificationPreferencesOut(**prefs)


@notification_router.put("/preferences", response_model=NotificationPreferencesOut)
@limiter.limit("60/minute")
def write_notification_preferences(
    request: Request,
    payload: NotificationPreferencesUpdate,
    user_email: str = Depends(_get_user_email),
) -> NotificationPreferencesOut:
    updated = update_notification_preferences(user_email, payload.model_dump(exclude_none=True))
    return NotificationPreferencesOut(**updated)


@notification_router.post("/push-token")
@limiter.limit("120/minute")
def add_push_token(
    request: Request,
    payload: PushTokenRequest,
    user_email: str = Depends(_get_user_email),
) -> dict[str, str]:
    register_push_token(user_email, payload.token, payload.platform)
    return {"status": "ok", "message": "Push token registered"}


@notification_router.delete("/push-token")
@limiter.limit("120/minute")
def deactivate_push_token(
    request: Request,
    token: str = Query(..., min_length=12, max_length=512),
    user_email: str = Depends(_get_user_email),
) -> dict[str, str]:
    remove_push_token(user_email, token)
    return {"status": "ok", "message": "Push token removed"}


@notification_router.post("/test", response_model=NotificationActionResponse)
@limiter.limit("30/minute")
def trigger_notification_test(
    request: Request,
    user_email: str = Depends(_get_user_email),
) -> NotificationActionResponse:
    result = send_test_notification_for_user(user_email)
    return NotificationActionResponse(**result)


@notification_router.post("/digest/send", response_model=NotificationActionResponse)
@limiter.limit("30/minute")
def trigger_daily_digest(
    request: Request,
    user_email: str = Depends(_get_user_email),
) -> NotificationActionResponse:
    result = send_daily_digest_for_user(user_email, force=True)
    return NotificationActionResponse(**result)


@notification_router.get("/dispatch-log", response_model=list[NotificationDispatchItem])
@limiter.limit("120/minute")
def read_dispatch_log(
    request: Request,
    limit: int = Query(25, ge=1, le=100),
    user_email: str = Depends(_get_user_email),
) -> list[NotificationDispatchItem]:
    items = list_dispatch_log(user_email, limit=limit)
    return [NotificationDispatchItem(**item) for item in items]
