from __future__ import annotations

import json
import logging
import os
import queue
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

from bson import ObjectId

from database.database import user_db

logger = logging.getLogger(__name__)

TOPIC_ALERTS_NOTIFICATION_DISPATCH = "alerts.notification_dispatch.v1"
TOPIC_DATA_REFRESH_COMPLETED = "data.refresh.completed.v1"

EventHandler = Callable[[dict[str, Any]], None]
DeadLetterStatus = str

EVENT_BUS_DLQ_COLLECTION = user_db["event_bus_dead_letters"]
EVENT_BUS_AUDIT_COLLECTION = user_db["event_bus_audit"]
_storage_indexes_initialized = False

_OPTIONAL_KAFKA_IMPORT_ERROR: str | None = None
try:
    from kafka import KafkaConsumer, KafkaProducer  # type: ignore
except Exception as exc:  # pragma: no cover - optional dependency
    KafkaConsumer = None  # type: ignore[assignment]
    KafkaProducer = None  # type: ignore[assignment]
    _OPTIONAL_KAFKA_IMPORT_ERROR = str(exc)


def _max_handler_retries() -> int:
    raw = os.getenv("EVENT_BUS_HANDLER_MAX_RETRIES", "2").strip() or "2"
    try:
        parsed = int(raw)
    except ValueError:
        parsed = 2
    return max(0, min(8, parsed))


def _handler_retry_backoff_ms() -> int:
    raw = os.getenv("EVENT_BUS_HANDLER_RETRY_BACKOFF_MS", "200").strip() or "200"
    try:
        parsed = int(raw)
    except ValueError:
        parsed = 200
    return max(0, min(5000, parsed))


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_envelope(topic: str, payload: dict[str, Any], *, key: str | None = None) -> dict[str, Any]:
    return {
        "event_id": uuid.uuid4().hex,
        "topic": topic,
        "key": key,
        "produced_at": _utc_iso_now(),
        "payload": payload,
    }


def _extract_payload(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        payload = value.get("payload")
        if isinstance(payload, dict):
            return payload
        return value
    return {}


def _ensure_storage_indexes() -> None:
    global _storage_indexes_initialized
    if _storage_indexes_initialized:
        return
    try:
        EVENT_BUS_DLQ_COLLECTION.create_index([("created_at", -1)])
        EVENT_BUS_DLQ_COLLECTION.create_index([("topic", 1), ("status", 1), ("created_at", -1)])
        EVENT_BUS_AUDIT_COLLECTION.create_index([("created_at", -1)])
        EVENT_BUS_AUDIT_COLLECTION.create_index([("topic", 1), ("created_at", -1)])
        _storage_indexes_initialized = True
    except Exception:
        logger.warning("Failed to initialize event bus storage indexes", exc_info=True)


def _safe_persist(collection: Any, doc: dict[str, Any]) -> None:
    try:
        _ensure_storage_indexes()
        collection.insert_one(doc)
    except Exception:
        logger.warning("Failed to persist event bus doc", exc_info=True)


def _handler_name(handler: EventHandler) -> str:
    module = getattr(handler, "__module__", "") or ""
    qualname = getattr(handler, "__qualname__", "") or getattr(handler, "__name__", "") or "handler"
    return f"{module}.{qualname}".strip(".")


def _record_dead_letter(
    *,
    topic: str,
    payload: dict[str, Any],
    handler_name: str,
    backend: str,
    error: str,
    attempts: int,
) -> None:
    now = datetime.now(timezone.utc)
    _safe_persist(
        EVENT_BUS_DLQ_COLLECTION,
        {
            "topic": topic,
            "payload": payload,
            "handler": handler_name,
            "backend": backend,
            "error": error[:2000],
            "attempts": attempts,
            "status": "failed",
            "retry_count": 0,
            "created_at": now,
            "updated_at": now,
            "last_failed_at": now,
        },
    )


def _record_audit(topic: str, payload: dict[str, Any], backend: str, status: str) -> None:
    if os.getenv("EVENT_BUS_AUDIT_ENABLED", "false").strip().lower() != "true":
        return
    _safe_persist(
        EVENT_BUS_AUDIT_COLLECTION,
        {
            "topic": topic,
            "payload": payload,
            "backend": backend,
            "status": status,
            "created_at": datetime.now(timezone.utc),
        },
    )


def _run_handler_with_retry(
    *,
    handler: EventHandler,
    topic: str,
    payload: dict[str, Any],
    backend: str,
) -> bool:
    retries = _max_handler_retries()
    delay_ms = _handler_retry_backoff_ms()
    handler_label = _handler_name(handler)

    for attempt in range(retries + 1):
        try:
            handler(payload)
            _record_audit(topic, payload, backend, "ok")
            return True
        except Exception as exc:
            if attempt >= retries:
                logger.warning(
                    "Event handler failed after retries topic=%s handler=%s backend=%s",
                    topic,
                    handler_label,
                    backend,
                    exc_info=True,
                )
                _record_dead_letter(
                    topic=topic,
                    payload=payload,
                    handler_name=handler_label,
                    backend=backend,
                    error=str(exc),
                    attempts=attempt + 1,
                )
                _record_audit(topic, payload, backend, "dead_lettered")
                return False
            if delay_ms > 0:
                sleep_ms = delay_ms * (2 ** attempt)
                time.sleep(sleep_ms / 1000.0)
    return False


class InMemoryEventBus:
    def __init__(self, *, max_queue_size: int = 5000) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}
        self._handlers_lock = threading.Lock()
        self._queue: queue.Queue[dict[str, Any] | None] = queue.Queue(maxsize=max(100, max_queue_size))
        self._running = threading.Event()
        self._worker_thread: threading.Thread | None = None

    def start(self) -> None:
        if self._running.is_set():
            return
        self._running.set()
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            name="event-bus-memory-worker",
            daemon=True,
        )
        self._worker_thread.start()
        logger.info("Event bus started (backend=memory)")

    def stop(self) -> None:
        if not self._running.is_set():
            return
        self._running.clear()
        try:
            self._queue.put_nowait(None)
        except queue.Full:
            pass
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=2.0)
        logger.info("Event bus stopped (backend=memory)")

    def subscribe(self, topic: str, handler: EventHandler) -> None:
        normalized_topic = str(topic or "").strip()
        if not normalized_topic:
            raise ValueError("topic is required")
        with self._handlers_lock:
            self._handlers.setdefault(normalized_topic, []).append(handler)

    def publish(self, topic: str, payload: dict[str, Any], *, key: str | None = None) -> bool:
        if not self._running.is_set():
            logger.warning("Event bus is not running; dropping publish topic=%s", topic)
            return False
        envelope = _build_envelope(topic, payload, key=key)
        try:
            self._queue.put_nowait(envelope)
            return True
        except queue.Full:
            logger.warning("Event bus queue full; dropping publish topic=%s", topic)
            return False

    def status(self) -> dict[str, Any]:
        with self._handlers_lock:
            topics = sorted(self._handlers.keys())
        return {
            "backend": "memory",
            "running": self._running.is_set(),
            "topics": topics,
            "queue_size": self._queue.qsize(),
        }

    def _dispatch(self, topic: str, payload: dict[str, Any]) -> None:
        with self._handlers_lock:
            handlers = list(self._handlers.get(topic, []))
        for handler in handlers:
            _run_handler_with_retry(
                handler=handler,
                topic=topic,
                payload=payload,
                backend="memory",
            )

    def _worker_loop(self) -> None:
        while self._running.is_set() or not self._queue.empty():
            try:
                item = self._queue.get(timeout=0.25)
            except queue.Empty:
                continue
            if item is None:
                self._queue.task_done()
                continue

            try:
                topic = str(item.get("topic") or "").strip()
                if not topic:
                    continue
                payload = _extract_payload(item)
                self._dispatch(topic, payload)
            finally:
                self._queue.task_done()


class KafkaEventBus:
    def __init__(
        self,
        *,
        bootstrap_servers: str,
        group_id: str,
        client_id: str,
        poll_timeout_ms: int = 1000,
        publish_timeout_s: float = 5.0,
    ) -> None:
        if KafkaProducer is None or KafkaConsumer is None:
            detail = _OPTIONAL_KAFKA_IMPORT_ERROR or "kafka-python is unavailable"
            raise RuntimeError(detail)

        self._bootstrap_servers = bootstrap_servers
        self._group_id = group_id
        self._client_id = client_id
        self._poll_timeout_ms = max(100, poll_timeout_ms)
        self._publish_timeout_s = max(0.5, publish_timeout_s)

        self._handlers: dict[str, list[EventHandler]] = {}
        self._handlers_lock = threading.Lock()
        self._running = threading.Event()
        self._consumer_thread: threading.Thread | None = None
        self._producer: Any | None = None
        self._consumer: Any | None = None

    def start(self) -> None:
        if self._running.is_set():
            return

        try:
            self._producer = KafkaProducer(
                bootstrap_servers=self._bootstrap_servers,
                acks="all",
                retries=3,
                linger_ms=10,
                value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            )
            self._consumer = KafkaConsumer(
                bootstrap_servers=self._bootstrap_servers,
                group_id=self._group_id,
                client_id=self._client_id,
                enable_auto_commit=True,
                auto_offset_reset=os.getenv("EVENT_BUS_KAFKA_AUTO_OFFSET_RESET", "latest").strip() or "latest",
                value_deserializer=lambda raw: json.loads(raw.decode("utf-8")),
            )
            self._refresh_subscription()

            self._running.set()
            self._consumer_thread = threading.Thread(
                target=self._consumer_loop,
                name="event-bus-kafka-consumer",
                daemon=True,
            )
            self._consumer_thread.start()
            logger.info("Event bus started (backend=kafka, bootstrap_servers=%s)", self._bootstrap_servers)
        except Exception:
            if self._consumer is not None:
                try:
                    self._consumer.close()
                except Exception:
                    logger.debug("Kafka consumer cleanup failed", exc_info=True)
            if self._producer is not None:
                try:
                    self._producer.close()
                except Exception:
                    logger.debug("Kafka producer cleanup failed", exc_info=True)
            self._consumer = None
            self._producer = None
            self._running.clear()
            raise

    def stop(self) -> None:
        if not self._running.is_set():
            return
        self._running.clear()

        consumer = self._consumer
        producer = self._producer
        self._consumer = None
        self._producer = None

        if consumer is not None:
            try:
                consumer.wakeup()
            except Exception:
                pass
            try:
                consumer.close()
            except Exception:
                logger.debug("Kafka consumer close failed", exc_info=True)

        if producer is not None:
            try:
                producer.flush(timeout=self._publish_timeout_s)
            except Exception:
                logger.debug("Kafka producer flush failed", exc_info=True)
            try:
                producer.close()
            except Exception:
                logger.debug("Kafka producer close failed", exc_info=True)

        if self._consumer_thread and self._consumer_thread.is_alive():
            self._consumer_thread.join(timeout=2.0)
        logger.info("Event bus stopped (backend=kafka)")

    def subscribe(self, topic: str, handler: EventHandler) -> None:
        normalized_topic = str(topic or "").strip()
        if not normalized_topic:
            raise ValueError("topic is required")
        with self._handlers_lock:
            self._handlers.setdefault(normalized_topic, []).append(handler)
        self._refresh_subscription()

    def publish(self, topic: str, payload: dict[str, Any], *, key: str | None = None) -> bool:
        if not self._running.is_set() or self._producer is None:
            logger.warning("Event bus is not running; dropping publish topic=%s", topic)
            return False
        envelope = _build_envelope(topic, payload, key=key)
        try:
            encoded_key = key.encode("utf-8") if key else None
            future = self._producer.send(topic, value=envelope, key=encoded_key)
            future.get(timeout=self._publish_timeout_s)
            return True
        except Exception:
            logger.warning("Kafka publish failed for topic=%s", topic, exc_info=True)
            return False

    def status(self) -> dict[str, Any]:
        with self._handlers_lock:
            topics = sorted(self._handlers.keys())
        return {
            "backend": "kafka",
            "running": self._running.is_set(),
            "topics": topics,
            "bootstrap_servers": self._bootstrap_servers,
            "group_id": self._group_id,
        }

    def _refresh_subscription(self) -> None:
        consumer = self._consumer
        if consumer is None:
            return
        with self._handlers_lock:
            topics = sorted(self._handlers.keys())
        if not topics:
            return
        try:
            consumer.subscribe(topics=topics)
        except Exception:
            logger.warning("Kafka topic subscription refresh failed", exc_info=True)

    def _dispatch(self, topic: str, payload: dict[str, Any]) -> None:
        with self._handlers_lock:
            handlers = list(self._handlers.get(topic, []))
        for handler in handlers:
            _run_handler_with_retry(
                handler=handler,
                topic=topic,
                payload=payload,
                backend="kafka",
            )

    def _consumer_loop(self) -> None:
        while self._running.is_set():
            consumer = self._consumer
            if consumer is None:
                time.sleep(0.2)
                continue

            try:
                records_map = consumer.poll(timeout_ms=self._poll_timeout_ms, max_records=100)
            except Exception:
                if self._running.is_set():
                    logger.warning("Kafka poll failed", exc_info=True)
                    time.sleep(0.5)
                continue

            for records in records_map.values():
                for record in records:
                    try:
                        topic = str(getattr(record, "topic", "") or "")
                        payload = _extract_payload(getattr(record, "value", {}))
                        if topic:
                            self._dispatch(topic, payload)
                    except Exception:
                        logger.warning("Kafka record handling failed", exc_info=True)


_event_bus_instance: InMemoryEventBus | KafkaEventBus | None = None
_event_bus_lock = threading.Lock()
_event_subscriptions: list[tuple[str, EventHandler]] = []


def _serialize_dead_letter(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc.get("_id")),
        "topic": str(doc.get("topic") or ""),
        "handler": str(doc.get("handler") or ""),
        "backend": str(doc.get("backend") or ""),
        "status": str(doc.get("status") or "failed"),
        "error": str(doc.get("error") or ""),
        "attempts": int(doc.get("attempts") or 0),
        "retry_count": int(doc.get("retry_count") or 0),
        "created_at": _utc_iso_now() if not isinstance(doc.get("created_at"), datetime) else doc["created_at"].isoformat(),
        "updated_at": _utc_iso_now() if not isinstance(doc.get("updated_at"), datetime) else doc["updated_at"].isoformat(),
        "payload": doc.get("payload") if isinstance(doc.get("payload"), dict) else {},
    }


def list_event_bus_dead_letters(*, limit: int = 25, status: DeadLetterStatus | None = None) -> list[dict[str, Any]]:
    _ensure_storage_indexes()
    fetch_limit = max(1, min(200, int(limit)))
    query: dict[str, Any] = {}
    if status:
        query["status"] = str(status).strip().lower()
    docs = EVENT_BUS_DLQ_COLLECTION.find(query).sort("created_at", -1).limit(fetch_limit)
    return [_serialize_dead_letter(doc) for doc in docs]


def retry_event_bus_dead_letter(dead_letter_id: str) -> dict[str, Any]:
    _ensure_storage_indexes()
    try:
        object_id = ObjectId(dead_letter_id)
    except Exception:
        return {"ok": False, "reason": "invalid_dead_letter_id"}

    doc = EVENT_BUS_DLQ_COLLECTION.find_one({"_id": object_id})
    if not doc:
        return {"ok": False, "reason": "dead_letter_not_found"}

    topic = str(doc.get("topic") or "").strip()
    payload = doc.get("payload") if isinstance(doc.get("payload"), dict) else {}
    if not topic or not isinstance(payload, dict):
        EVENT_BUS_DLQ_COLLECTION.update_one(
            {"_id": object_id},
            {
                "$set": {
                    "status": "retry_failed",
                    "updated_at": datetime.now(timezone.utc),
                    "error": "dead_letter_payload_invalid",
                },
                "$inc": {"retry_count": 1},
            },
        )
        return {"ok": False, "reason": "dead_letter_payload_invalid"}

    key = str(payload.get("user_email") or "").strip() or None
    published = publish_event(topic, payload, key=key)
    now = datetime.now(timezone.utc)
    EVENT_BUS_DLQ_COLLECTION.update_one(
        {"_id": object_id},
        {
            "$set": {
                "status": "republished" if published else "retry_failed",
                "updated_at": now,
                "last_retry_at": now,
            },
            "$inc": {"retry_count": 1},
        },
    )
    return {
        "ok": bool(published),
        "reason": "republished" if published else "publish_failed",
    }


def retry_failed_event_bus_dead_letters(
    *,
    limit: int = 20,
    include_retry_failed: bool = True,
) -> dict[str, int]:
    _ensure_storage_indexes()
    fetch_limit = max(1, min(500, int(limit)))

    statuses = ["failed"]
    if include_retry_failed:
        statuses.append("retry_failed")

    docs = list(
        EVENT_BUS_DLQ_COLLECTION.find({"status": {"$in": statuses}})
        .sort("created_at", 1)
        .limit(fetch_limit)
    )

    attempted = 0
    republished = 0
    retry_failed = 0
    for doc in docs:
        attempted += 1
        result = retry_event_bus_dead_letter(str(doc.get("_id")))
        if result.get("ok"):
            republished += 1
        else:
            retry_failed += 1

    return {
        "attempted": attempted,
        "republished": republished,
        "retry_failed": retry_failed,
    }


def _create_event_bus() -> InMemoryEventBus | KafkaEventBus:
    backend = os.getenv("EVENT_BUS_BACKEND", "memory").strip().lower() or "memory"

    if backend == "kafka":
        bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "").strip()
        if not bootstrap_servers:
            logger.warning("EVENT_BUS_BACKEND=kafka but KAFKA_BOOTSTRAP_SERVERS is empty. Falling back to memory.")
        else:
            group_id = os.getenv("EVENT_BUS_KAFKA_GROUP_ID", "snooptrade-events").strip() or "snooptrade-events"
            client_id = os.getenv("EVENT_BUS_KAFKA_CLIENT_ID", "snooptrade-api").strip() or "snooptrade-api"
            poll_timeout_ms = int(os.getenv("EVENT_BUS_KAFKA_POLL_TIMEOUT_MS", "1000"))
            publish_timeout_s = float(os.getenv("EVENT_BUS_KAFKA_PUBLISH_TIMEOUT_S", "5"))
            try:
                return KafkaEventBus(
                    bootstrap_servers=bootstrap_servers,
                    group_id=group_id,
                    client_id=client_id,
                    poll_timeout_ms=poll_timeout_ms,
                    publish_timeout_s=publish_timeout_s,
                )
            except Exception as exc:
                logger.warning("Kafka event bus initialization failed (%s). Falling back to memory.", exc)

    max_queue_size = int(os.getenv("EVENT_BUS_MEMORY_QUEUE_MAX", "5000"))
    return InMemoryEventBus(max_queue_size=max_queue_size)


def _get_event_bus() -> InMemoryEventBus | KafkaEventBus:
    global _event_bus_instance
    with _event_bus_lock:
        if _event_bus_instance is None:
            _event_bus_instance = _create_event_bus()
        return _event_bus_instance


def start_event_bus() -> None:
    global _event_bus_instance
    bus = _get_event_bus()
    try:
        bus.start()
        return
    except Exception as exc:
        logger.warning("Event bus start failed (%s). Falling back to memory backend.", exc, exc_info=True)

    max_queue_size = int(os.getenv("EVENT_BUS_MEMORY_QUEUE_MAX", "5000"))
    fallback_bus = InMemoryEventBus(max_queue_size=max_queue_size)
    with _event_bus_lock:
        _event_bus_instance = fallback_bus
        subscriptions = list(_event_subscriptions)

    for topic, handler in subscriptions:
        fallback_bus.subscribe(topic, handler)
    fallback_bus.start()


def stop_event_bus() -> None:
    bus = _get_event_bus()
    bus.stop()


def subscribe_event(topic: str, handler: EventHandler) -> None:
    with _event_bus_lock:
        exists = any(existing_topic == topic and existing_handler is handler for existing_topic, existing_handler in _event_subscriptions)
        if not exists:
            _event_subscriptions.append((topic, handler))
    bus = _get_event_bus()
    bus.subscribe(topic, handler)


def publish_event(topic: str, payload: dict[str, Any], *, key: str | None = None) -> bool:
    bus = _get_event_bus()
    return bus.publish(topic, payload, key=key)


def get_event_bus_status() -> dict[str, Any]:
    bus = _get_event_bus()
    status = bus.status()
    try:
        _ensure_storage_indexes()
        status["dead_letters_failed"] = int(EVENT_BUS_DLQ_COLLECTION.count_documents({"status": "failed"}))
        status["dead_letters_retry_failed"] = int(EVENT_BUS_DLQ_COLLECTION.count_documents({"status": "retry_failed"}))
        status["dead_letters_republished"] = int(EVENT_BUS_DLQ_COLLECTION.count_documents({"status": "republished"}))
    except Exception:
        logger.debug("Failed to attach dead-letter counts to event bus status", exc_info=True)
    return status
