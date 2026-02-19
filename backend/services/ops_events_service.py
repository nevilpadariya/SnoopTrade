from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from database.database import user_db

OPS_EVENTS_COLLECTION = user_db["ops_events"]
_indexes_initialized = False
_handlers_registered = False


def _ensure_indexes() -> None:
    global _indexes_initialized
    if _indexes_initialized:
        return
    OPS_EVENTS_COLLECTION.create_index([("created_at", -1)])
    OPS_EVENTS_COLLECTION.create_index([("dataset", 1), ("status", 1), ("created_at", -1)])
    OPS_EVENTS_COLLECTION.create_index([("ticker", 1), ("created_at", -1)])
    _indexes_initialized = True


def _to_iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value or "")


def _parse_iso_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def handle_data_refresh_event(payload: dict[str, Any]) -> None:
    _ensure_indexes()
    dataset = str(payload.get("dataset") or "unknown").strip().lower()
    ticker = str(payload.get("ticker") or "").strip().upper()
    status = str(payload.get("status") or "unknown").strip().lower()
    cik = str(payload.get("cik") or "").strip() or None
    source = str(payload.get("source") or "scheduler").strip().lower()
    error = str(payload.get("error") or "").strip() or None

    try:
        duration_ms = int(payload.get("duration_ms") or 0)
    except (TypeError, ValueError):
        duration_ms = 0

    now = datetime.now(timezone.utc)
    OPS_EVENTS_COLLECTION.insert_one(
        {
            "dataset": dataset,
            "ticker": ticker,
            "status": status,
            "cik": cik,
            "source": source,
            "error": error,
            "duration_ms": max(0, duration_ms),
            "started_at": _parse_iso_datetime(payload.get("started_at")),
            "finished_at": _parse_iso_datetime(payload.get("finished_at")),
            "created_at": now,
            "payload": payload,
        }
    )


def register_ops_event_handlers() -> None:
    global _handlers_registered
    if _handlers_registered:
        return

    from services.event_bus import TOPIC_DATA_REFRESH_COMPLETED, subscribe_event

    subscribe_event(TOPIC_DATA_REFRESH_COMPLETED, handle_data_refresh_event)
    _handlers_registered = True


def list_ops_events(
    *,
    limit: int = 50,
    dataset: str | None = None,
    ticker: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    _ensure_indexes()
    fetch_limit = max(1, min(500, int(limit)))
    query: dict[str, Any] = {}
    if dataset:
        query["dataset"] = dataset.strip().lower()
    if ticker:
        query["ticker"] = ticker.strip().upper()
    if status:
        query["status"] = status.strip().lower()

    docs = OPS_EVENTS_COLLECTION.find(query).sort("created_at", -1).limit(fetch_limit)
    rows: list[dict[str, Any]] = []
    for doc in docs:
        rows.append(
            {
                "id": str(doc.get("_id")),
                "dataset": str(doc.get("dataset") or ""),
                "ticker": str(doc.get("ticker") or ""),
                "status": str(doc.get("status") or ""),
                "source": str(doc.get("source") or ""),
                "cik": str(doc.get("cik") or "") or None,
                "error": str(doc.get("error") or "") or None,
                "duration_ms": int(doc.get("duration_ms") or 0),
                "started_at": _to_iso(doc.get("started_at")),
                "finished_at": _to_iso(doc.get("finished_at")),
                "created_at": _to_iso(doc.get("created_at")),
            }
        )
    return rows
