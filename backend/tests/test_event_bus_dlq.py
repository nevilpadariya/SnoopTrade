from __future__ import annotations

import sys
import types
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId

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

from services import event_bus


class _FakeCursor:
    def __init__(self, docs: list[dict]):
        self._docs = list(docs)

    def sort(self, key: str, direction: int):
        reverse = direction < 0
        self._docs.sort(key=lambda item: item.get(key), reverse=reverse)
        return self

    def limit(self, count: int):
        self._docs = self._docs[:count]
        return self

    def __iter__(self):
        return iter(self._docs)


class _FakeCollection:
    def __init__(self, docs: list[dict] | None = None):
        self.docs = list(docs or [])

    def create_index(self, *_args, **_kwargs):
        return None

    def find(self, query: dict | None = None):
        query = query or {}
        filtered = list(self.docs)
        status_filter = query.get("status")
        if isinstance(status_filter, dict) and "$in" in status_filter:
            allowed = set(status_filter["$in"])
            filtered = [doc for doc in filtered if doc.get("status") in allowed]
        elif isinstance(status_filter, str):
            filtered = [doc for doc in filtered if doc.get("status") == status_filter]
        return _FakeCursor(filtered)

    def find_one(self, query: dict):
        object_id = query.get("_id")
        for doc in self.docs:
            if doc.get("_id") == object_id:
                return doc
        return None

    def update_one(self, query: dict, update: dict):
        target = self.find_one(query)
        if target is None:
            return None
        set_values = update.get("$set") or {}
        inc_values = update.get("$inc") or {}
        for key, value in set_values.items():
            target[key] = value
        for key, value in inc_values.items():
            target[key] = int(target.get(key, 0)) + int(value)
        return None

    def count_documents(self, query: dict):
        status_value = query.get("status")
        return sum(1 for doc in self.docs if doc.get("status") == status_value)


def test_retry_failed_event_bus_dead_letters_batch_republishes(monkeypatch):
    now = datetime.now(timezone.utc)
    docs = [
        {
            "_id": ObjectId(),
            "topic": event_bus.TOPIC_ALERTS_NOTIFICATION_DISPATCH,
            "payload": {"user_email": "a@example.com"},
            "status": "failed",
            "retry_count": 0,
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": ObjectId(),
            "topic": event_bus.TOPIC_ALERTS_NOTIFICATION_DISPATCH,
            "payload": {"user_email": "b@example.com"},
            "status": "retry_failed",
            "retry_count": 1,
            "created_at": now,
            "updated_at": now,
        },
    ]
    fake_collection = _FakeCollection(docs)

    publish_calls: list[tuple[str, dict, str | None]] = []

    def _fake_publish(topic: str, payload: dict, *, key: str | None = None) -> bool:
        publish_calls.append((topic, payload, key))
        return True

    monkeypatch.setattr(event_bus, "EVENT_BUS_DLQ_COLLECTION", fake_collection)
    monkeypatch.setattr(event_bus, "_ensure_storage_indexes", lambda: None)
    monkeypatch.setattr(event_bus, "publish_event", _fake_publish)

    result = event_bus.retry_failed_event_bus_dead_letters(limit=10, include_retry_failed=True)

    assert result == {"attempted": 2, "republished": 2, "retry_failed": 0}
    assert len(publish_calls) == 2
    assert all(doc["status"] == "republished" for doc in docs)
    assert docs[0]["retry_count"] == 1
    assert docs[1]["retry_count"] == 2


def test_retry_failed_event_bus_dead_letters_batch_respects_filter(monkeypatch):
    now = datetime.now(timezone.utc)
    docs = [
        {
            "_id": ObjectId(),
            "topic": event_bus.TOPIC_ALERTS_NOTIFICATION_DISPATCH,
            "payload": {"user_email": "c@example.com"},
            "status": "failed",
            "retry_count": 0,
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": ObjectId(),
            "topic": event_bus.TOPIC_ALERTS_NOTIFICATION_DISPATCH,
            "payload": {"user_email": "d@example.com"},
            "status": "retry_failed",
            "retry_count": 0,
            "created_at": now,
            "updated_at": now,
        },
    ]
    fake_collection = _FakeCollection(docs)

    monkeypatch.setattr(event_bus, "EVENT_BUS_DLQ_COLLECTION", fake_collection)
    monkeypatch.setattr(event_bus, "_ensure_storage_indexes", lambda: None)
    monkeypatch.setattr(event_bus, "publish_event", lambda *_args, **_kwargs: False)

    result = event_bus.retry_failed_event_bus_dead_letters(limit=10, include_retry_failed=False)

    assert result == {"attempted": 1, "republished": 0, "retry_failed": 1}
    assert docs[0]["status"] == "retry_failed"
    assert docs[1]["status"] == "retry_failed"
