from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator

from database.database import user_db
from services.auth_services import decode_access_token
from utils.limiter import limiter

users_router = APIRouter(prefix="/users")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

USER_OUTCOMES_COLLECTION = user_db["user_outcomes"]
_indexes_initialized = False

OutcomeType = Literal["followed", "ignored", "entered", "exited"]


class UserOutcomeCreate(BaseModel):
    ticker: str = Field(min_length=1, max_length=8)
    signal_id: str | None = Field(default=None, max_length=80)
    outcome_type: OutcomeType
    timestamp: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class UserOutcomeOut(BaseModel):
    id: str
    user_id: str
    ticker: str
    signal_id: str | None = None
    outcome_type: OutcomeType
    timestamp: str
    notes: str | None = None
    created_at: str


def _to_iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc).isoformat()
    return str(value)


def _get_user_email(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication payload")
    return email


def _ensure_indexes() -> None:
    global _indexes_initialized
    if _indexes_initialized:
        return

    USER_OUTCOMES_COLLECTION.create_index([("user_email", 1), ("created_at", -1)])
    USER_OUTCOMES_COLLECTION.create_index([("user_email", 1), ("ticker", 1), ("created_at", -1)])
    USER_OUTCOMES_COLLECTION.create_index([("user_email", 1), ("signal_id", 1), ("created_at", -1)])
    _indexes_initialized = True


def _parse_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    text = value.strip()
    if not text:
        return datetime.now(timezone.utc)

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def _serialize_outcome(doc: dict[str, Any]) -> UserOutcomeOut:
    timestamp = doc.get("timestamp")
    if not isinstance(timestamp, datetime):
        timestamp = doc.get("created_at")

    return UserOutcomeOut(
        id=str(doc.get("_id")),
        user_id=str(doc.get("user_email", "")),
        ticker=str(doc.get("ticker", "")),
        signal_id=doc.get("signal_id"),
        outcome_type=doc.get("outcome_type", "ignored"),
        timestamp=_to_iso(timestamp),
        notes=doc.get("notes"),
        created_at=_to_iso(doc.get("created_at")),
    )


@users_router.post("/outcomes", response_model=UserOutcomeOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("120/minute")
def create_user_outcome(
    request: Request,
    payload: UserOutcomeCreate,
    user_email: str = Depends(_get_user_email),
) -> UserOutcomeOut:
    _ensure_indexes()
    now = datetime.now(timezone.utc)
    occurred_at = _parse_timestamp(payload.timestamp)

    doc = {
        "user_email": user_email,
        "ticker": payload.ticker,
        "signal_id": payload.signal_id,
        "outcome_type": payload.outcome_type,
        "timestamp": occurred_at,
        "notes": payload.notes,
        "created_at": now,
        "updated_at": now,
    }

    result = USER_OUTCOMES_COLLECTION.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_outcome(doc)


@users_router.get("/outcomes", response_model=list[UserOutcomeOut])
@limiter.limit("120/minute")
def list_user_outcomes(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    ticker: str | None = Query(default=None, min_length=1, max_length=8),
    outcome_type: OutcomeType | None = Query(default=None),
    user_email: str = Depends(_get_user_email),
) -> list[UserOutcomeOut]:
    _ensure_indexes()

    query: dict[str, Any] = {"user_email": user_email}
    if ticker:
        query["ticker"] = ticker.upper().strip()
    if outcome_type:
        query["outcome_type"] = outcome_type

    docs = USER_OUTCOMES_COLLECTION.find(query).sort("created_at", -1).limit(limit)
    return [_serialize_outcome(doc) for doc in docs]
