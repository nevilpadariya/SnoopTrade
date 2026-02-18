import html
import logging
import time
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import quote_plus, urlparse
from xml.etree import ElementTree

import requests
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from database.database import user_db
from utils.limiter import limiter

logger = logging.getLogger(__name__)

news_router = APIRouter(prefix="/news")

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
CACHE_TTL_SECONDS = 600
USER_AGENT = "SnoopTradeNewsBot/1.0 (+https://snooptrade.com)"
NEWS_CLICK_COLLECTION = user_db["news_click_events"]

_news_cache: dict[str, Any] = {
    "key": None,
    "ts": 0.0,
    "items": [],
}
_click_indexes_initialized = False


class InsiderNewsItem(BaseModel):
    title: str
    link: str
    source: str
    source_url: str | None = None
    published_at: str | None = None


class InsiderNewsClickPayload(BaseModel):
    title: str = Field(min_length=3, max_length=320)
    link: str = Field(min_length=8, max_length=1024)
    source: str = Field(min_length=1, max_length=160)
    source_url: str | None = Field(default=None, max_length=1024)
    published_at: str | None = Field(default=None, max_length=80)
    click_target: str = Field(default="story", pattern="^(story|source)$")
    position: int | None = Field(default=None, ge=0, le=100)
    total_items: int | None = Field(default=None, ge=0, le=100)
    page: str = Field(default="landing", max_length=80)
    session_id: str | None = Field(default=None, max_length=120)
    referrer: str | None = Field(default=None, max_length=1024)


def _ensure_click_indexes() -> None:
    global _click_indexes_initialized
    if _click_indexes_initialized:
        return
    NEWS_CLICK_COLLECTION.create_index([("created_at", -1)])
    NEWS_CLICK_COLLECTION.create_index([("session_id", 1), ("created_at", -1)])
    NEWS_CLICK_COLLECTION.create_index([("source", 1), ("created_at", -1)])
    _click_indexes_initialized = True


def _parse_published_at(pub_date: str | None) -> str | None:
    if not pub_date:
        return None
    try:
        return parsedate_to_datetime(pub_date).isoformat()
    except Exception:
        return None


def _extract_source(item_el: ElementTree.Element, link: str) -> tuple[str, str | None]:
    source_el = item_el.find("source")
    if source_el is not None:
        source_name = (source_el.text or "").strip()
        source_url = source_el.get("url")
        if source_name:
            return source_name, source_url

    hostname = urlparse(link).hostname or "Unknown Source"
    return hostname.replace("www.", ""), None


def _fetch_google_news(query: str, limit: int) -> list[InsiderNewsItem]:
    feed_url = GOOGLE_NEWS_RSS.format(query=quote_plus(query))
    response = requests.get(feed_url, headers={"User-Agent": USER_AGENT}, timeout=8)
    response.raise_for_status()

    root = ElementTree.fromstring(response.content)
    parsed_items: list[InsiderNewsItem] = []
    for item_el in root.findall("./channel/item"):
        title = html.unescape((item_el.findtext("title") or "").strip())
        link = (item_el.findtext("link") or "").strip()
        if not title or not link:
            continue

        source_name, source_url = _extract_source(item_el, link)
        published_at = _parse_published_at(item_el.findtext("pubDate"))

        parsed_items.append(
            InsiderNewsItem(
                title=title,
                link=link,
                source=source_name,
                source_url=source_url,
                published_at=published_at,
            )
        )
        if len(parsed_items) >= limit:
            break

    return parsed_items


@news_router.get("/insider", response_model=list[InsiderNewsItem])
@limiter.limit("40/minute")
def get_insider_news(
    request: Request,
    limit: int = Query(8, ge=3, le=20),
    q: str = Query("insider trading stocks", min_length=3, max_length=120),
) -> list[InsiderNewsItem]:
    """Return latest insider-trading related headlines from free RSS feeds."""
    cache_key = f"{q}|{limit}"
    now = time.time()
    if _news_cache["key"] == cache_key and now - float(_news_cache["ts"]) < CACHE_TTL_SECONDS:
        return _news_cache["items"]

    try:
        items = _fetch_google_news(q, limit)
    except Exception as exc:
        logger.warning("Failed to fetch insider news feed: %s", exc, exc_info=True)
        # Serve stale cached content if available instead of failing the UI.
        if _news_cache["items"]:
            return _news_cache["items"]
        return []

    _news_cache["key"] = cache_key
    _news_cache["ts"] = now
    _news_cache["items"] = items
    return items


@news_router.post("/insider/click")
@limiter.limit("120/minute")
def track_insider_news_click(
    request: Request,
    payload: InsiderNewsClickPayload,
) -> dict[str, str]:
    """Track engagement clicks on insider-news cards."""
    try:
        _ensure_click_indexes()
        doc = payload.model_dump()
        doc["created_at"] = datetime.now(timezone.utc)
        doc["user_agent"] = (request.headers.get("user-agent") or "")[:256]
        NEWS_CLICK_COLLECTION.insert_one(doc)
    except Exception as exc:
        # Do not fail user navigation if analytics write fails.
        logger.warning("Failed to store insider-news click analytics: %s", exc, exc_info=True)
    return {"status": "ok"}


@news_router.get("/insider/stats")
@limiter.limit("20/minute")
def get_insider_news_stats(
    request: Request,
    days: int = Query(7, ge=1, le=90),
) -> dict[str, Any]:
    """Basic engagement stats for the landing news slider."""
    try:
        _ensure_click_indexes()
        since = datetime.now(timezone.utc) - timedelta(days=days)
        filter_query = {"created_at": {"$gte": since}}

        total_clicks = NEWS_CLICK_COLLECTION.count_documents(filter_query)
        unique_sessions = len(
            NEWS_CLICK_COLLECTION.distinct(
                "session_id",
                {"created_at": {"$gte": since}, "session_id": {"$nin": [None, ""]}},
            )
        )

        top_sources = list(
            NEWS_CLICK_COLLECTION.aggregate(
                [
                    {"$match": filter_query},
                    {"$group": {"_id": "$source", "clicks": {"$sum": 1}}},
                    {"$sort": {"clicks": -1}},
                    {"$limit": 8},
                ]
            )
        )
        top_headlines = list(
            NEWS_CLICK_COLLECTION.aggregate(
                [
                    {"$match": filter_query},
                    {"$group": {"_id": "$title", "clicks": {"$sum": 1}}},
                    {"$sort": {"clicks": -1}},
                    {"$limit": 8},
                ]
            )
        )

        return {
            "status": "ok",
            "days": days,
            "total_clicks": total_clicks,
            "unique_sessions": unique_sessions,
            "top_sources": [
                {"source": item.get("_id") or "Unknown", "clicks": int(item.get("clicks", 0))}
                for item in top_sources
            ],
            "top_headlines": [
                {"title": item.get("_id") or "Untitled", "clicks": int(item.get("clicks", 0))}
                for item in top_headlines
            ],
        }
    except Exception as exc:
        logger.warning("Failed to compute insider-news stats: %s", exc, exc_info=True)
        return {
            "status": "degraded",
            "days": days,
            "total_clicks": 0,
            "unique_sessions": 0,
            "top_sources": [],
            "top_headlines": [],
        }
