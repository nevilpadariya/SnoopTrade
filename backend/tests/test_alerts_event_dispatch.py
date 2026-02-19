from __future__ import annotations

import sys
import types
import os
from pathlib import Path

from bson import ObjectId

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")


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

    def update_many(self, *_args, **_kwargs):
        return types.SimpleNamespace(modified_count=0)

    def delete_one(self, *_args, **_kwargs):
        return types.SimpleNamespace(deleted_count=0)

    def count_documents(self, *_args, **_kwargs):
        return 0

    def distinct(self, *_args, **_kwargs):
        return []


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

from routers import alerts_router


class _FakeRulesCollection:
    def __init__(self, docs: list[dict]):
        self.docs = docs

    def find(self, _query: dict):
        return list(self.docs)


def test_run_alert_scan_for_user_publishes_event_and_skips_fallback(monkeypatch):
    rules = [{"_id": ObjectId(), "user_email": "u@example.com", "is_active": True}]
    monkeypatch.setattr(alerts_router, "ALERT_RULES_COLLECTION", _FakeRulesCollection(rules))
    monkeypatch.setattr(alerts_router, "_ensure_indexes", lambda: None)
    monkeypatch.setattr(alerts_router, "_scan_rule", lambda **_kwargs: 2)
    monkeypatch.setattr(alerts_router, "ENABLE_ALERT_NOTIFICATION_EVENT_BUS", True)

    fallback_called = {"count": 0}
    monkeypatch.setattr(alerts_router, "_publish_realtime_dispatch_event", lambda **_kwargs: True)
    monkeypatch.setattr(
        alerts_router,
        "_dispatch_realtime_notifications_fallback",
        lambda **_kwargs: fallback_called.__setitem__("count", fallback_called["count"] + 1),
    )

    generated, total_rules = alerts_router.run_alert_scan_for_user("u@example.com")

    assert generated == 2
    assert total_rules == 1
    assert fallback_called["count"] == 0


def test_run_alert_scan_for_user_falls_back_when_publish_fails(monkeypatch):
    rules = [{"_id": ObjectId(), "user_email": "u@example.com", "is_active": True}]
    monkeypatch.setattr(alerts_router, "ALERT_RULES_COLLECTION", _FakeRulesCollection(rules))
    monkeypatch.setattr(alerts_router, "_ensure_indexes", lambda: None)
    monkeypatch.setattr(alerts_router, "_scan_rule", lambda **_kwargs: 1)
    monkeypatch.setattr(alerts_router, "ENABLE_ALERT_NOTIFICATION_EVENT_BUS", True)
    monkeypatch.setattr(alerts_router, "_publish_realtime_dispatch_event", lambda **_kwargs: False)

    fallback_called = {"count": 0}
    monkeypatch.setattr(
        alerts_router,
        "_dispatch_realtime_notifications_fallback",
        lambda **_kwargs: fallback_called.__setitem__("count", fallback_called["count"] + 1),
    )

    generated, total_rules = alerts_router.run_alert_scan_for_user("u@example.com")

    assert generated == 1
    assert total_rules == 1
    assert fallback_called["count"] == 1
