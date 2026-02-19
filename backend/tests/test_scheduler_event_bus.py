from __future__ import annotations

import sys
import types
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class _NoopCollection:
    def create_index(self, *_args, **_kwargs):
        return None

    def insert_one(self, *_args, **_kwargs):
        return None

    def find(self, *_args, **_kwargs):
        return []

    def find_one(self, *_args, **_kwargs):
        return None

    def update_one(self, *_args, **_kwargs):
        return None

    def count_documents(self, *_args, **_kwargs):
        return 0


class _NoopDB:
    def __getitem__(self, _name: str):
        return _NoopCollection()


if "database.database" not in sys.modules:
    fake_db_module = types.ModuleType("database.database")
    fake_db_module.user_db = _NoopDB()
    fake_db_module.stock_db = _NoopDB()
    fake_db_module.sec_db = _NoopDB()
    fake_db_module.client = types.SimpleNamespace(admin=types.SimpleNamespace(command=lambda *_args, **_kwargs: {"ok": 1}))
    sys.modules["database.database"] = fake_db_module

import scheduler


def test_emit_data_refresh_event_publishes_expected_payload(monkeypatch):
    published: dict = {}

    def _fake_publish(topic: str, payload: dict, *, key: str | None = None):
        published["topic"] = topic
        published["payload"] = payload
        published["key"] = key
        return True

    monkeypatch.setattr(scheduler, "ENABLE_DATA_REFRESH_EVENTS", True)
    monkeypatch.setattr(scheduler, "publish_event", _fake_publish)

    started_at = datetime(2026, 2, 19, 12, 0, tzinfo=timezone.utc)
    finished_at = datetime(2026, 2, 19, 12, 0, 5, tzinfo=timezone.utc)
    scheduler._emit_data_refresh_event(
        dataset="stock",
        ticker="AAPL",
        status="success",
        started_at=started_at,
        finished_at=finished_at,
        cik=None,
        error=None,
    )

    assert published["topic"] == scheduler.TOPIC_DATA_REFRESH_COMPLETED
    assert published["key"] == "AAPL"
    assert published["payload"]["dataset"] == "stock"
    assert published["payload"]["ticker"] == "AAPL"
    assert published["payload"]["status"] == "success"
    assert published["payload"]["duration_ms"] == 5000
    assert published["payload"]["source"] == "scheduler"


def test_emit_data_refresh_event_noop_when_disabled(monkeypatch):
    called = {"count": 0}

    def _fake_publish(_topic: str, _payload: dict, *, key: str | None = None):
        _ = key
        called["count"] += 1
        return True

    monkeypatch.setattr(scheduler, "ENABLE_DATA_REFRESH_EVENTS", False)
    monkeypatch.setattr(scheduler, "publish_event", _fake_publish)

    started_at = datetime.now(timezone.utc)
    finished_at = datetime.now(timezone.utc)
    scheduler._emit_data_refresh_event(
        dataset="sec",
        ticker="MSFT",
        status="failed",
        started_at=started_at,
        finished_at=finished_at,
        cik="0000789019",
        error="boom",
    )

    assert called["count"] == 0


def test_run_event_bus_dlq_retry_uses_configured_batch(monkeypatch):
    calls: dict = {}

    def _fake_retry(*, limit: int, include_retry_failed: bool):
        calls["limit"] = limit
        calls["include_retry_failed"] = include_retry_failed
        return {"attempted": 1, "republished": 1, "retry_failed": 0}

    monkeypatch.setattr(scheduler, "EVENT_BUS_DLQ_RETRY_BATCH", 37)
    monkeypatch.setattr(scheduler, "retry_failed_event_bus_dead_letters", _fake_retry)

    scheduler.run_event_bus_dlq_retry()

    assert calls == {"limit": 37, "include_retry_failed": True}
