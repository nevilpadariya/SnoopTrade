from __future__ import annotations

import hashlib
import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator
from pymongo.errors import DuplicateKeyError

from database.database import user_db
from models.users import MessageResponse
from services.auth_services import decode_access_token
from services.sec_service import get_all_transactions
from utils.limiter import limiter

logger = logging.getLogger(__name__)

alerts_router = APIRouter(prefix="/alerts")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

ALERT_RULES_COLLECTION = user_db["alert_rules"]
ALERT_EVENTS_COLLECTION = user_db["alert_events"]

_indexes_initialized = False


RuleType = Literal["large_buy", "repeat_buyer", "cluster_buying"]

RULE_LABELS: dict[RuleType, str] = {
    "large_buy": "Large Buy",
    "repeat_buyer": "Repeat Buyer",
    "cluster_buying": "Cluster Buying",
}


class AlertRuleCreate(BaseModel):
    ticker: str = Field(min_length=1, max_length=8)
    rule_type: RuleType
    threshold: float = Field(gt=0)
    lookback_days: int = Field(default=30, ge=1, le=365)
    name: str | None = Field(default=None, max_length=120)

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, value: str) -> str:
        return value.strip().upper()


class AlertRuleOut(BaseModel):
    id: str
    ticker: str
    rule_type: RuleType
    threshold: float
    lookback_days: int
    name: str
    is_active: bool
    created_at: str
    updated_at: str


class AlertEventOut(BaseModel):
    id: str
    rule_id: str
    ticker: str
    event_type: RuleType
    title: str
    message: str
    severity: Literal["low", "medium", "high"]
    occurred_at: str
    created_at: str
    is_read: bool
    details: dict[str, Any] = Field(default_factory=dict)


class AlertScanResponse(BaseModel):
    generated: int
    total_rules: int


class AlertSummaryItemOut(BaseModel):
    id: str
    ticker: str
    title: str
    message: str
    severity: Literal["low", "medium", "high"]
    created_at: str


class AlertSummaryOut(BaseModel):
    unread_count: int
    high_severity_unread: int
    latest_event_at: str | None = None
    items: list[AlertSummaryItemOut]


def _ensure_indexes() -> None:
    global _indexes_initialized
    if _indexes_initialized:
        return

    ALERT_RULES_COLLECTION.create_index([("user_email", 1), ("created_at", -1)])
    ALERT_RULES_COLLECTION.create_index([("user_email", 1), ("is_active", 1)])

    ALERT_EVENTS_COLLECTION.create_index([("user_email", 1), ("created_at", -1)])
    ALERT_EVENTS_COLLECTION.create_index([("user_email", 1), ("is_read", 1), ("created_at", -1)])
    ALERT_EVENTS_COLLECTION.create_index([("user_email", 1), ("fingerprint", 1)], unique=True)
    _indexes_initialized = True


def _to_iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc).isoformat()
    return str(value)


def _parse_day(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if len(text) >= 10:
            text = text[:10]
        try:
            return datetime.strptime(text, "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def _parse_number(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().replace(",", "").replace("$", "")
        if cleaned.startswith("(") and cleaned.endswith(")"):
            cleaned = f"-{cleaned[1:-1]}"
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0


def _get_user_email(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication payload")
    return email


def _period_for_days(days: int) -> str:
    if days <= 7:
        return "1w"
    if days <= 35:
        return "1m"
    if days <= 84:
        return "3m"
    if days <= 168:
        return "6m"
    return "1y"


def _serialize_rule(doc: dict[str, Any]) -> AlertRuleOut:
    return AlertRuleOut(
        id=str(doc["_id"]),
        ticker=str(doc.get("ticker", "")),
        rule_type=doc.get("rule_type"),
        threshold=float(doc.get("threshold", 0)),
        lookback_days=int(doc.get("lookback_days", 30)),
        name=str(doc.get("name", "Alert rule")),
        is_active=bool(doc.get("is_active", True)),
        created_at=_to_iso(doc.get("created_at")),
        updated_at=_to_iso(doc.get("updated_at")),
    )


def _serialize_event(doc: dict[str, Any]) -> AlertEventOut:
    return AlertEventOut(
        id=str(doc["_id"]),
        rule_id=str(doc.get("rule_id")),
        ticker=str(doc.get("ticker", "")),
        event_type=doc.get("event_type"),
        title=str(doc.get("title", "Alert")),
        message=str(doc.get("message", "")),
        severity=doc.get("severity", "medium"),
        occurred_at=_to_iso(doc.get("occurred_at")),
        created_at=_to_iso(doc.get("created_at")),
        is_read=bool(doc.get("is_read", False)),
        details=doc.get("details") or {},
    )


def _serialize_summary_item(doc: dict[str, Any]) -> AlertSummaryItemOut:
    return AlertSummaryItemOut(
        id=str(doc["_id"]),
        ticker=str(doc.get("ticker", "")),
        title=str(doc.get("title", "Alert")),
        message=str(doc.get("message", "")),
        severity=doc.get("severity", "medium"),
        created_at=_to_iso(doc.get("created_at")),
    )


def _tx_value(tx: Any, key: str) -> Any:
    if isinstance(tx, dict):
        return tx.get(key)
    return getattr(tx, key, None)


def _compute_buys_for_rule(
    rule: dict[str, Any],
    transactions_cache: dict[tuple[str, str], list[Any]],
) -> list[dict[str, Any]]:
    ticker = str(rule.get("ticker", "")).upper()
    lookback_days = int(rule.get("lookback_days", 30))
    period = _period_for_days(lookback_days)
    cache_key = (ticker, period)

    if cache_key not in transactions_cache:
        transactions_cache[cache_key] = get_all_transactions(ticker, period) or []

    since_day = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).date()
    buys: list[dict[str, Any]] = []

    for tx in transactions_cache[cache_key]:
        transaction_code = str(_tx_value(tx, "transaction_code") or "").upper().strip()
        if transaction_code != "P":
            continue

        transaction_day = _parse_day(_tx_value(tx, "transaction_date"))
        if transaction_day is None or transaction_day < since_day:
            continue

        shares = _parse_number(_tx_value(tx, "shares"))
        owner = str(_tx_value(tx, "reporting_owner_name") or "Unknown Insider").strip()

        buys.append(
            {
                "transaction_day": transaction_day,
                "shares": shares,
                "owner": owner,
            }
        )

    return buys


def _insert_event_if_new(user_email: str, event_doc: dict[str, Any]) -> bool:
    try:
        ALERT_EVENTS_COLLECTION.insert_one(event_doc)
        return True
    except DuplicateKeyError:
        return False
    except Exception as exc:
        logger.warning("Failed to insert alert event: %s", exc, exc_info=True)
        return False


def _build_base_event(
    *,
    user_email: str,
    rule: dict[str, Any],
    ticker: str,
    fingerprint_key: str,
    title: str,
    message: str,
    severity: Literal["low", "medium", "high"],
    occurred_at: datetime,
    details: dict[str, Any],
) -> dict[str, Any]:
    fingerprint = hashlib.sha256(f"{user_email}|{fingerprint_key}".encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    return {
        "user_email": user_email,
        "rule_id": str(rule["_id"]),
        "ticker": ticker,
        "event_type": rule.get("rule_type"),
        "title": title,
        "message": message,
        "severity": severity,
        "occurred_at": occurred_at,
        "details": details,
        "is_read": False,
        "created_at": now,
        "updated_at": now,
        "fingerprint": fingerprint,
    }


def _scan_rule(
    *,
    user_email: str,
    rule: dict[str, Any],
    transactions_cache: dict[tuple[str, str], list[Any]],
) -> int:
    rule_type = rule.get("rule_type")
    ticker = str(rule.get("ticker", "")).upper()
    threshold = float(rule.get("threshold", 0))
    generated = 0

    buys = _compute_buys_for_rule(rule, transactions_cache)
    if not buys:
        return 0

    if rule_type == "large_buy":
        min_shares = threshold
        for buy in buys:
            if buy["shares"] < min_shares:
                continue

            occurred_at = datetime(
                buy["transaction_day"].year,
                buy["transaction_day"].month,
                buy["transaction_day"].day,
                tzinfo=timezone.utc,
            )
            fingerprint_key = (
                f"large_buy|{rule['_id']}|{ticker}|{buy['transaction_day'].isoformat()}|"
                f"{buy['owner']}|{buy['shares']:.4f}"
            )
            event_doc = _build_base_event(
                user_email=user_email,
                rule=rule,
                ticker=ticker,
                fingerprint_key=fingerprint_key,
                title=f"{ticker}: large insider buy detected",
                message=f"{buy['owner']} bought {int(buy['shares']):,} shares.",
                severity="high",
                occurred_at=occurred_at,
                details={
                    "owner": buy["owner"],
                    "shares": buy["shares"],
                    "threshold": min_shares,
                },
            )
            if _insert_event_if_new(user_email, event_doc):
                generated += 1

    elif rule_type == "repeat_buyer":
        min_buys = max(1, int(threshold))
        by_owner: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for buy in buys:
            by_owner[buy["owner"]].append(buy)

        for owner, owner_buys in by_owner.items():
            if len(owner_buys) < min_buys:
                continue

            owner_buys.sort(key=lambda row: row["transaction_day"])
            latest_day = owner_buys[-1]["transaction_day"]
            total_shares = sum(row["shares"] for row in owner_buys)
            occurred_at = datetime(latest_day.year, latest_day.month, latest_day.day, tzinfo=timezone.utc)
            fingerprint_key = f"repeat_buyer|{rule['_id']}|{ticker}|{owner}|{latest_day.isoformat()}|{len(owner_buys)}"
            event_doc = _build_base_event(
                user_email=user_email,
                rule=rule,
                ticker=ticker,
                fingerprint_key=fingerprint_key,
                title=f"{ticker}: repeat insider buyer",
                message=f"{owner} logged {len(owner_buys)} buy transactions in the lookback window.",
                severity="medium",
                occurred_at=occurred_at,
                details={
                    "owner": owner,
                    "buy_count": len(owner_buys),
                    "total_shares": total_shares,
                    "threshold": min_buys,
                },
            )
            if _insert_event_if_new(user_email, event_doc):
                generated += 1

    elif rule_type == "cluster_buying":
        min_transactions = max(1, int(threshold))
        if len(buys) >= min_transactions:
            buys.sort(key=lambda row: row["transaction_day"])
            latest_day = buys[-1]["transaction_day"]
            unique_insiders = len({row["owner"] for row in buys})
            total_shares = sum(row["shares"] for row in buys)
            occurred_at = datetime(latest_day.year, latest_day.month, latest_day.day, tzinfo=timezone.utc)
            fingerprint_key = (
                f"cluster_buying|{rule['_id']}|{ticker}|{latest_day.isoformat()}|"
                f"{len(buys)}|{unique_insiders}"
            )
            event_doc = _build_base_event(
                user_email=user_email,
                rule=rule,
                ticker=ticker,
                fingerprint_key=fingerprint_key,
                title=f"{ticker}: insider cluster buying",
                message=f"{len(buys)} buy transactions from {unique_insiders} insiders detected.",
                severity="high" if unique_insiders >= 3 else "medium",
                occurred_at=occurred_at,
                details={
                    "buy_count": len(buys),
                    "unique_insiders": unique_insiders,
                    "total_shares": total_shares,
                    "threshold": min_transactions,
                },
            )
            if _insert_event_if_new(user_email, event_doc):
                generated += 1

    return generated


def run_alert_scan_for_user(
    user_email: str,
    *,
    transactions_cache: dict[tuple[str, str], list[Any]] | None = None,
) -> tuple[int, int]:
    """
    Execute all active alert rules for one user.

    Returns: (generated_events, total_active_rules)
    """
    _ensure_indexes()
    rules = list(ALERT_RULES_COLLECTION.find({"user_email": user_email, "is_active": True}))
    if not rules:
        return 0, 0

    generated = 0
    cache = transactions_cache if transactions_cache is not None else {}
    for rule in rules:
        try:
            generated += _scan_rule(user_email=user_email, rule=rule, transactions_cache=cache)
        except Exception as exc:
            logger.warning("Failed to scan alert rule %s: %s", str(rule.get("_id")), exc, exc_info=True)

    return generated, len(rules)


def run_alert_scan_for_all_users(*, limit_users: int | None = None) -> dict[str, int]:
    """
    Execute active alert rules for all users that have at least one active rule.
    """
    _ensure_indexes()
    active_user_emails = ALERT_RULES_COLLECTION.distinct("user_email", {"is_active": True})
    if limit_users is not None and limit_users > 0:
        active_user_emails = active_user_emails[:limit_users]

    scanned_users = 0
    failed_users = 0
    generated_events = 0
    total_rules = 0
    shared_transactions_cache: dict[tuple[str, str], list[Any]] = {}

    for user_email in active_user_emails:
        if not user_email:
            continue
        try:
            generated, rule_count = run_alert_scan_for_user(
                str(user_email),
                transactions_cache=shared_transactions_cache,
            )
            generated_events += generated
            total_rules += rule_count
            scanned_users += 1
        except Exception as exc:
            failed_users += 1
            logger.warning("Failed to scan alerts for user %s: %s", user_email, exc, exc_info=True)

    return {
        "scanned_users": scanned_users,
        "failed_users": failed_users,
        "generated_events": generated_events,
        "total_rules": total_rules,
    }


@alerts_router.post("/rules", response_model=AlertRuleOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def create_alert_rule(
    request: Request,
    payload: AlertRuleCreate,
    user_email: str = Depends(_get_user_email),
) -> AlertRuleOut:
    _ensure_indexes()
    now = datetime.now(timezone.utc)
    rule_name = (payload.name or f"{RULE_LABELS[payload.rule_type]} • {payload.ticker}").strip()

    doc = {
        "user_email": user_email,
        "ticker": payload.ticker,
        "rule_type": payload.rule_type,
        "threshold": payload.threshold,
        "lookback_days": payload.lookback_days,
        "name": rule_name,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = ALERT_RULES_COLLECTION.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_rule(doc)


@alerts_router.get("/rules", response_model=list[AlertRuleOut])
@limiter.limit("60/minute")
def list_alert_rules(
    request: Request,
    user_email: str = Depends(_get_user_email),
) -> list[AlertRuleOut]:
    _ensure_indexes()
    docs = ALERT_RULES_COLLECTION.find({"user_email": user_email}).sort("created_at", -1)
    return [_serialize_rule(doc) for doc in docs]


@alerts_router.delete("/rules/{rule_id}", response_model=MessageResponse)
@limiter.limit("30/minute")
def delete_alert_rule(
    request: Request,
    rule_id: str,
    user_email: str = Depends(_get_user_email),
) -> MessageResponse:
    _ensure_indexes()
    try:
        object_id = ObjectId(rule_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid rule id") from exc

    result = ALERT_RULES_COLLECTION.delete_one({"_id": object_id, "user_email": user_email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")

    return MessageResponse(message="Alert rule deleted")


@alerts_router.post("/scan", response_model=AlertScanResponse)
@limiter.limit("20/minute")
def scan_alerts(
    request: Request,
    user_email: str = Depends(_get_user_email),
) -> AlertScanResponse:
    generated, total_rules = run_alert_scan_for_user(user_email)
    return AlertScanResponse(generated=generated, total_rules=total_rules)


@alerts_router.get("/events", response_model=list[AlertEventOut])
@limiter.limit("60/minute")
def list_alert_events(
    request: Request,
    limit: int = Query(25, ge=1, le=200),
    unread_only: bool = Query(False),
    user_email: str = Depends(_get_user_email),
) -> list[AlertEventOut]:
    _ensure_indexes()
    query: dict[str, Any] = {"user_email": user_email}
    if unread_only:
        query["is_read"] = False

    docs = ALERT_EVENTS_COLLECTION.find(query).sort("created_at", -1).limit(limit)
    return [_serialize_event(doc) for doc in docs]


@alerts_router.get("/summary", response_model=AlertSummaryOut)
@limiter.limit("120/minute")
def get_alert_summary(
    request: Request,
    limit: int = Query(5, ge=1, le=20),
    user_email: str = Depends(_get_user_email),
) -> AlertSummaryOut:
    _ensure_indexes()
    unread_query = {"user_email": user_email, "is_read": False}
    unread_count = ALERT_EVENTS_COLLECTION.count_documents(unread_query)
    high_severity_unread = ALERT_EVENTS_COLLECTION.count_documents({**unread_query, "severity": "high"})

    latest_doc = ALERT_EVENTS_COLLECTION.find_one({"user_email": user_email}, sort=[("created_at", -1)])
    latest_event_at = _to_iso(latest_doc.get("created_at")) if latest_doc else None

    preview_docs = ALERT_EVENTS_COLLECTION.find(unread_query).sort("created_at", -1).limit(limit)
    preview_items = [_serialize_summary_item(doc) for doc in preview_docs]

    return AlertSummaryOut(
        unread_count=unread_count,
        high_severity_unread=high_severity_unread,
        latest_event_at=latest_event_at,
        items=preview_items,
    )


@alerts_router.patch("/events/{event_id}/read", response_model=MessageResponse)
@limiter.limit("60/minute")
def mark_alert_event_read(
    request: Request,
    event_id: str,
    user_email: str = Depends(_get_user_email),
) -> MessageResponse:
    _ensure_indexes()
    try:
        object_id = ObjectId(event_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event id") from exc

    result = ALERT_EVENTS_COLLECTION.update_one(
        {"_id": object_id, "user_email": user_email},
        {
            "$set": {
                "is_read": True,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert event not found")
    return MessageResponse(message="Alert marked as read")


@alerts_router.patch("/events/read-all", response_model=MessageResponse)
@limiter.limit("30/minute")
def mark_all_alert_events_read(
    request: Request,
    user_email: str = Depends(_get_user_email),
) -> MessageResponse:
    _ensure_indexes()
    result = ALERT_EVENTS_COLLECTION.update_many(
        {"user_email": user_email, "is_read": False},
        {
            "$set": {
                "is_read": True,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return MessageResponse(message=f"Marked {result.modified_count} alert(s) as read")
