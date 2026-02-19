from __future__ import annotations

import logging
import os
import smtplib
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any, Literal
from zoneinfo import ZoneInfo

import requests

from database.database import user_db

logger = logging.getLogger(__name__)

NOTIFICATION_PREFS_COLLECTION = user_db["notification_preferences"]
NOTIFICATION_DISPATCH_COLLECTION = user_db["notification_dispatch_log"]
PUSH_TOKENS_COLLECTION = user_db["push_tokens"]
ALERT_EVENTS_COLLECTION = user_db["alert_events"]

SeverityType = Literal["low", "medium", "high"]

SEVERITY_RANK = {
    "low": 1,
    "medium": 2,
    "high": 3,
}

DEFAULT_PREFS: dict[str, Any] = {
    "email_enabled": False,
    "webhook_enabled": False,
    "webhook_url": None,
    "push_enabled": False,
    "daily_digest_enabled": True,
    "digest_hour_local": 8,
    "timezone": "America/New_York",
    "min_severity": "medium",
}

_indexes_initialized = False


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc).isoformat()
    return str(value)


def _ensure_indexes() -> None:
    global _indexes_initialized
    if _indexes_initialized:
        return

    NOTIFICATION_PREFS_COLLECTION.create_index([("user_email", 1)], unique=True)
    NOTIFICATION_PREFS_COLLECTION.create_index([("daily_digest_enabled", 1), ("digest_hour_local", 1)])

    NOTIFICATION_DISPATCH_COLLECTION.create_index([("user_email", 1), ("created_at", -1)])
    NOTIFICATION_DISPATCH_COLLECTION.create_index([("user_email", 1), ("kind", 1), ("created_at", -1)])

    PUSH_TOKENS_COLLECTION.create_index([("user_email", 1), ("token", 1)], unique=True)
    PUSH_TOKENS_COLLECTION.create_index([("user_email", 1), ("is_active", 1), ("updated_at", -1)])

    _indexes_initialized = True


def _normalize_timezone(value: str | None) -> str:
    candidate = (value or "").strip() or str(DEFAULT_PREFS["timezone"])
    try:
        ZoneInfo(candidate)
        return candidate
    except Exception:
        return str(DEFAULT_PREFS["timezone"])


def _normalize_severity(value: str | None) -> SeverityType:
    candidate = (value or "").strip().lower()
    if candidate not in SEVERITY_RANK:
        return "medium"
    return candidate  # type: ignore[return-value]


def _normalize_digest_hour(value: Any) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return int(DEFAULT_PREFS["digest_hour_local"])
    return max(0, min(23, parsed))


def _normalize_webhook_url(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return cleaned[:1024]
    return None


def _normalize_bool(value: Any, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "y", "on"}:
            return True
        if lowered in {"0", "false", "no", "n", "off"}:
            return False
    return default


def _normalize_preferences_doc(user_email: str, doc: dict[str, Any] | None) -> dict[str, Any]:
    source = doc or {}
    normalized = {
        "user_email": user_email,
        "email_enabled": _normalize_bool(source.get("email_enabled"), bool(DEFAULT_PREFS["email_enabled"])),
        "webhook_enabled": _normalize_bool(source.get("webhook_enabled"), bool(DEFAULT_PREFS["webhook_enabled"])),
        "webhook_url": _normalize_webhook_url(source.get("webhook_url")),
        "push_enabled": _normalize_bool(source.get("push_enabled"), bool(DEFAULT_PREFS["push_enabled"])),
        "daily_digest_enabled": _normalize_bool(source.get("daily_digest_enabled"), bool(DEFAULT_PREFS["daily_digest_enabled"])),
        "digest_hour_local": _normalize_digest_hour(source.get("digest_hour_local")),
        "timezone": _normalize_timezone(source.get("timezone")),
        "min_severity": _normalize_severity(source.get("min_severity")),
        "last_digest_local_date": source.get("last_digest_local_date"),
        "created_at": _to_iso(source.get("created_at")),
        "updated_at": _to_iso(source.get("updated_at")),
    }

    if normalized["webhook_enabled"] and not normalized["webhook_url"]:
        normalized["webhook_enabled"] = False

    return normalized


def get_notification_preferences(user_email: str) -> dict[str, Any]:
    _ensure_indexes()
    doc = NOTIFICATION_PREFS_COLLECTION.find_one({"user_email": user_email})
    if doc:
        return _normalize_preferences_doc(user_email, doc)

    now = _utc_now()
    new_doc = {
        "user_email": user_email,
        **DEFAULT_PREFS,
        "created_at": now,
        "updated_at": now,
    }
    NOTIFICATION_PREFS_COLLECTION.insert_one(new_doc)
    return _normalize_preferences_doc(user_email, new_doc)


def update_notification_preferences(user_email: str, payload: dict[str, Any]) -> dict[str, Any]:
    _ensure_indexes()
    current = get_notification_preferences(user_email)

    merged = {
        "email_enabled": _normalize_bool(payload.get("email_enabled"), bool(current["email_enabled"])),
        "webhook_enabled": _normalize_bool(payload.get("webhook_enabled"), bool(current["webhook_enabled"])),
        "webhook_url": _normalize_webhook_url(payload.get("webhook_url", current.get("webhook_url"))),
        "push_enabled": _normalize_bool(payload.get("push_enabled"), bool(current["push_enabled"])),
        "daily_digest_enabled": _normalize_bool(payload.get("daily_digest_enabled"), bool(current["daily_digest_enabled"])),
        "digest_hour_local": _normalize_digest_hour(payload.get("digest_hour_local", current.get("digest_hour_local"))),
        "timezone": _normalize_timezone(payload.get("timezone", current.get("timezone"))),
        "min_severity": _normalize_severity(payload.get("min_severity", current.get("min_severity"))),
    }

    if merged["webhook_enabled"] and not merged["webhook_url"]:
        merged["webhook_enabled"] = False

    now = _utc_now()
    NOTIFICATION_PREFS_COLLECTION.update_one(
        {"user_email": user_email},
        {
            "$set": {
                **merged,
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )

    return get_notification_preferences(user_email)


def register_push_token(user_email: str, token: str, platform: str) -> dict[str, Any]:
    _ensure_indexes()
    cleaned_token = token.strip()
    cleaned_platform = platform.strip().lower()[:20] if platform else "unknown"
    now = _utc_now()

    PUSH_TOKENS_COLLECTION.update_one(
        {"user_email": user_email, "token": cleaned_token},
        {
            "$set": {
                "platform": cleaned_platform,
                "is_active": True,
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now,
            },
        },
        upsert=True,
    )

    return {
        "status": "ok",
        "token": cleaned_token,
        "platform": cleaned_platform,
    }


def remove_push_token(user_email: str, token: str) -> dict[str, Any]:
    _ensure_indexes()
    result = PUSH_TOKENS_COLLECTION.update_one(
        {"user_email": user_email, "token": token.strip()},
        {
            "$set": {
                "is_active": False,
                "updated_at": _utc_now(),
            }
        },
    )
    return {
        "status": "ok",
        "modified": int(result.modified_count),
    }


def _active_push_tokens(user_email: str) -> list[str]:
    docs = PUSH_TOKENS_COLLECTION.find(
        {"user_email": user_email, "is_active": True},
        {"_id": 0, "token": 1},
    )
    tokens: list[str] = []
    for doc in docs:
        token = str(doc.get("token") or "").strip()
        if token:
            tokens.append(token)
    return tokens


def _meets_min_severity(event_severity: str, min_severity: SeverityType) -> bool:
    left = SEVERITY_RANK.get(str(event_severity).lower(), 2)
    right = SEVERITY_RANK.get(min_severity, 2)
    return left >= right


def _log_dispatch(
    *,
    user_email: str,
    channel: str,
    kind: str,
    success: bool,
    reason: str,
    payload: dict[str, Any] | None = None,
) -> None:
    try:
        NOTIFICATION_DISPATCH_COLLECTION.insert_one(
            {
                "user_email": user_email,
                "channel": channel,
                "kind": kind,
                "success": success,
                "reason": reason[:240],
                "payload": payload or {},
                "created_at": _utc_now(),
            }
        )
    except Exception:
        logger.warning("Failed to write notification dispatch log", exc_info=True)


def _send_email(user_email: str, subject: str, body: str) -> tuple[bool, str]:
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    if not smtp_host:
        return False, "smtp_not_configured"

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM", "noreply@snooptrade.local").strip()
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() != "false"

    message = EmailMessage()
    message["Subject"] = subject[:180]
    message["From"] = smtp_from
    message["To"] = user_email
    message.set_content(body[:8000])

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as smtp:
            smtp.ehlo()
            if smtp_use_tls:
                smtp.starttls()
                smtp.ehlo()
            if smtp_username and smtp_password:
                smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
        return True, "sent"
    except Exception as exc:
        logger.warning("Email notification failed for %s: %s", user_email, exc, exc_info=True)
        return False, str(exc)


def _send_webhook(webhook_url: str | None, payload: dict[str, Any]) -> tuple[bool, str]:
    if not webhook_url:
        return False, "missing_webhook_url"
    try:
        response = requests.post(webhook_url, json=payload, timeout=8)
        if 200 <= response.status_code < 300:
            return True, "sent"
        return False, f"status_{response.status_code}"
    except Exception as exc:
        logger.warning("Webhook notification failed: %s", exc, exc_info=True)
        return False, str(exc)


def _send_push(tokens: list[str], title: str, body: str, payload: dict[str, Any]) -> tuple[bool, str]:
    if not tokens:
        return False, "no_push_tokens"

    endpoint = os.getenv("EXPO_PUSH_ENDPOINT", "https://exp.host/--/api/v2/push/send").strip()
    messages = [
        {
            "to": token,
            "sound": "default",
            "title": title[:80],
            "body": body[:180],
            "data": payload,
        }
        for token in tokens
    ]

    try:
        response = requests.post(endpoint, json=messages, timeout=8)
        if 200 <= response.status_code < 300:
            return True, "sent"
        return False, f"status_{response.status_code}"
    except Exception as exc:
        logger.warning("Push notification failed: %s", exc, exc_info=True)
        return False, str(exc)


def _event_brief(event: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(event.get("_id") or ""),
        "ticker": str(event.get("ticker") or ""),
        "severity": str(event.get("severity") or "medium"),
        "title": str(event.get("title") or "Alert"),
        "message": str(event.get("message") or ""),
        "created_at": _to_iso(event.get("created_at")),
    }


def _build_compact_event_lines(events: list[dict[str, Any]]) -> str:
    lines = []
    for event in events[:6]:
        lines.append(
            f"- [{str(event.get('severity') or 'medium').upper()}] "
            f"{str(event.get('ticker') or '?')}: {str(event.get('title') or 'Alert')}"
        )
    return "\n".join(lines)


def dispatch_realtime_notifications_for_user(
    user_email: str,
    *,
    events: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    _ensure_indexes()
    prefs = get_notification_preferences(user_email)

    if not (prefs["email_enabled"] or prefs["webhook_enabled"] or prefs["push_enabled"]):
        return {
            "status": "skipped",
            "reason": "no_channels_enabled",
            "attempted": 0,
            "sent": 0,
        }

    if events is None:
        since = _utc_now() - timedelta(minutes=20)
        events = list(
            ALERT_EVENTS_COLLECTION.find(
                {"user_email": user_email, "is_read": False, "created_at": {"$gte": since}}
            ).sort("created_at", -1).limit(12)
        )

    filtered = [
        event
        for event in events
        if _meets_min_severity(str(event.get("severity") or "medium"), prefs["min_severity"])
    ]

    if not filtered:
        return {
            "status": "skipped",
            "reason": "no_events_after_filter",
            "attempted": 0,
            "sent": 0,
        }

    newest = filtered[0]
    subject = f"SnoopTrade alert: {str(newest.get('ticker') or 'watchlist')}"
    body = (
        f"You have {len(filtered)} new insider alert(s).\n\n"
        f"Top alert: {str(newest.get('title') or 'Alert')}\n"
        f"{str(newest.get('message') or '')}\n\n"
        f"Recent alerts:\n{_build_compact_event_lines(filtered)}\n\n"
        "This is decision support only, not financial advice."
    )

    payload = {
        "type": "realtime",
        "user_email": user_email,
        "generated_at": _to_iso(_utc_now()),
        "count": len(filtered),
        "events": [_event_brief(event) for event in filtered[:6]],
    }

    attempted = 0
    sent = 0

    if prefs["email_enabled"]:
        attempted += 1
        ok, reason = _send_email(user_email, subject, body)
        sent += int(ok)
        _log_dispatch(user_email=user_email, channel="email", kind="realtime", success=ok, reason=reason, payload=payload)

    if prefs["webhook_enabled"]:
        attempted += 1
        ok, reason = _send_webhook(prefs.get("webhook_url"), payload)
        sent += int(ok)
        _log_dispatch(user_email=user_email, channel="webhook", kind="realtime", success=ok, reason=reason, payload=payload)

    if prefs["push_enabled"]:
        attempted += 1
        tokens = _active_push_tokens(user_email)
        ok, reason = _send_push(tokens, subject, str(newest.get("message") or "New insider alert"), payload)
        sent += int(ok)
        _log_dispatch(user_email=user_email, channel="push", kind="realtime", success=ok, reason=reason, payload=payload)

    return {
        "status": "ok" if sent > 0 else "degraded",
        "reason": "sent" if sent > 0 else "delivery_failed",
        "attempted": attempted,
        "sent": sent,
        "event_count": len(filtered),
    }


def send_daily_digest_for_user(
    user_email: str,
    *,
    force: bool = False,
    now_utc: datetime | None = None,
) -> dict[str, Any]:
    _ensure_indexes()
    now_utc = now_utc or _utc_now()
    prefs = get_notification_preferences(user_email)

    if not prefs["daily_digest_enabled"] and not force:
        return {
            "status": "skipped",
            "reason": "digest_disabled",
            "sent": 0,
        }

    timezone_name = str(prefs.get("timezone") or DEFAULT_PREFS["timezone"])
    try:
        local_tz = ZoneInfo(timezone_name)
    except Exception:
        local_tz = ZoneInfo(str(DEFAULT_PREFS["timezone"]))

    local_now = now_utc.astimezone(local_tz)
    local_date = local_now.date().isoformat()

    if not force:
        if int(local_now.hour) != int(prefs["digest_hour_local"]):
            return {
                "status": "skipped",
                "reason": "outside_digest_window",
                "sent": 0,
            }

        if prefs.get("last_digest_local_date") == local_date:
            return {
                "status": "skipped",
                "reason": "already_sent_today",
                "sent": 0,
            }

    since = now_utc - timedelta(hours=24)
    events = list(
        ALERT_EVENTS_COLLECTION.find(
            {
                "user_email": user_email,
                "created_at": {"$gte": since},
            }
        ).sort("created_at", -1).limit(80)
    )

    filtered = [
        event
        for event in events
        if _meets_min_severity(str(event.get("severity") or "medium"), prefs["min_severity"])
    ]

    if not filtered:
        return {
            "status": "skipped",
            "reason": "no_digest_events",
            "sent": 0,
        }

    subject = f"SnoopTrade Daily Digest • {len(filtered)} alert(s)"
    body = (
        f"Daily digest generated at {local_now.strftime('%Y-%m-%d %H:%M %Z')}\n\n"
        f"Alerts in the last 24h: {len(filtered)}\n"
        f"Minimum severity: {str(prefs['min_severity']).upper()}\n\n"
        f"Highlights:\n{_build_compact_event_lines(filtered)}\n\n"
        "This is educational decision support, not investment advice."
    )

    payload = {
        "type": "digest",
        "user_email": user_email,
        "generated_at": _to_iso(now_utc),
        "local_time": local_now.isoformat(),
        "count": len(filtered),
        "events": [_event_brief(event) for event in filtered[:10]],
    }

    attempted = 0
    sent = 0

    if prefs["email_enabled"]:
        attempted += 1
        ok, reason = _send_email(user_email, subject, body)
        sent += int(ok)
        _log_dispatch(user_email=user_email, channel="email", kind="digest", success=ok, reason=reason, payload=payload)

    if prefs["webhook_enabled"]:
        attempted += 1
        ok, reason = _send_webhook(prefs.get("webhook_url"), payload)
        sent += int(ok)
        _log_dispatch(user_email=user_email, channel="webhook", kind="digest", success=ok, reason=reason, payload=payload)

    if prefs["push_enabled"]:
        attempted += 1
        tokens = _active_push_tokens(user_email)
        ok, reason = _send_push(tokens, "SnoopTrade Daily Digest", f"{len(filtered)} alert(s) in your digest", payload)
        sent += int(ok)
        _log_dispatch(user_email=user_email, channel="push", kind="digest", success=ok, reason=reason, payload=payload)

    if sent > 0:
        NOTIFICATION_PREFS_COLLECTION.update_one(
            {"user_email": user_email},
            {
                "$set": {
                    "last_digest_local_date": local_date,
                    "updated_at": now_utc,
                }
            },
        )

    return {
        "status": "ok" if sent > 0 else "degraded",
        "reason": "sent" if sent > 0 else "delivery_failed",
        "attempted": attempted,
        "sent": sent,
        "event_count": len(filtered),
    }


def send_due_daily_digests_for_all_users(now_utc: datetime | None = None) -> dict[str, int]:
    _ensure_indexes()
    now_utc = now_utc or _utc_now()

    users = NOTIFICATION_PREFS_COLLECTION.distinct("user_email", {"daily_digest_enabled": True})
    processed = 0
    sent = 0
    skipped = 0
    failed = 0

    for user_email in users:
        if not user_email:
            continue
        processed += 1
        try:
            result = send_daily_digest_for_user(str(user_email), now_utc=now_utc, force=False)
            if result.get("status") == "ok":
                sent += 1
            else:
                skipped += 1
        except Exception:
            failed += 1
            logger.warning("Daily digest failed for %s", user_email, exc_info=True)

    return {
        "processed": processed,
        "sent": sent,
        "skipped": skipped,
        "failed": failed,
    }


def send_test_notification_for_user(user_email: str) -> dict[str, Any]:
    test_event = {
        "_id": "test",
        "ticker": "TEST",
        "severity": "high",
        "title": "Test alert from SnoopTrade",
        "message": "This is a notification channel test.",
        "created_at": _utc_now(),
    }
    return dispatch_realtime_notifications_for_user(user_email, events=[test_event])


def list_dispatch_log(user_email: str, limit: int = 25) -> list[dict[str, Any]]:
    _ensure_indexes()
    docs = NOTIFICATION_DISPATCH_COLLECTION.find({"user_email": user_email}).sort("created_at", -1).limit(limit)
    items: list[dict[str, Any]] = []
    for doc in docs:
        items.append(
            {
                "id": str(doc.get("_id")),
                "channel": str(doc.get("channel") or "unknown"),
                "kind": str(doc.get("kind") or "realtime"),
                "success": bool(doc.get("success", False)),
                "reason": str(doc.get("reason") or ""),
                "created_at": _to_iso(doc.get("created_at")),
            }
        )
    return items
