import html
import logging
import time
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import quote_plus, urlparse
from xml.etree import ElementTree

import requests
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from database.database import user_db, sec_db, stock_db
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
_landing_metrics_cache: dict[str, Any] = {
    "key": None,
    "ts": 0.0,
    "value": None,
}
_click_indexes_initialized = False

LANDING_METRICS_TTL_SECONDS = 600
MAX_FILING_LAG_DAYS = 30
FILING_LAG_SAMPLE_PER_COLLECTION = 25
STOCK_SPARKLINE_POINTS = 30


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


class LandingHeroMetrics(BaseModel):
    ticker: str
    price_change_percent_30d: float | None = None
    sparkline_prices: list[float] = Field(default_factory=list)
    daily_transactions_24h: int
    average_filing_lag_days: float | None = None
    lag_sample_size: int = 0
    generated_at: str


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


def _parse_iso_day(value: Any) -> date | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

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


def _compute_daily_transactions_24h() -> int:
    since_day = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
    total = 0
    for collection_name in sec_db.list_collection_names():
        if not collection_name.startswith("form_4_links_"):
            continue
        try:
            total += sec_db[collection_name].count_documents({"transaction_date": {"$gte": since_day}})
        except Exception as exc:
            logger.warning("Failed to count daily transactions for %s: %s", collection_name, exc, exc_info=True)
    return total


def _compute_average_filing_lag_days() -> tuple[float | None, int]:
    lags: list[int] = []
    projection = {"_id": 0, "transaction_date": 1, "filing_date": 1}

    for collection_name in sec_db.list_collection_names():
        if not collection_name.startswith("form_4_links_"):
            continue
        try:
            cursor = (
                sec_db[collection_name]
                .find(
                    {
                        "transaction_date": {"$exists": True, "$ne": None},
                        "filing_date": {"$exists": True, "$ne": None},
                    },
                    projection,
                )
                .sort("transaction_date", -1)
                .limit(FILING_LAG_SAMPLE_PER_COLLECTION)
            )
            for doc in cursor:
                transaction_day = _parse_iso_day(doc.get("transaction_date"))
                filing_day = _parse_iso_day(doc.get("filing_date"))
                if transaction_day is None or filing_day is None:
                    continue
                lag_days = (filing_day - transaction_day).days
                if 0 <= lag_days <= MAX_FILING_LAG_DAYS:
                    lags.append(lag_days)
        except Exception as exc:
            logger.warning("Failed to compute filing lag for %s: %s", collection_name, exc, exc_info=True)

    if not lags:
        return None, 0
    avg_lag = round(sum(lags) / len(lags), 2)
    return avg_lag, len(lags)


def _compute_ticker_price_metrics(ticker: str) -> tuple[float | None, list[float]]:
    collection = stock_db[f"stock_data_{ticker}"]
    docs = list(
        collection.find({}, {"_id": 0, "Date": 1, "Close": 1})
        .sort("Date", -1)
        .limit(STOCK_SPARKLINE_POINTS)
    )
    if not docs:
        return None, []

    ordered = list(reversed(docs))
    prices: list[float] = []
    for doc in ordered:
        close_value = doc.get("Close")
        try:
            if close_value is None:
                continue
            prices.append(round(float(close_value), 2))
        except (TypeError, ValueError):
            continue

    if len(prices) < 2:
        return None, prices

    first_price = prices[0]
    if first_price <= 0:
        return None, prices

    percent_change = round(((prices[-1] - first_price) / first_price) * 100, 2)
    return percent_change, prices


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


@news_router.get("/landing/hero-metrics", response_model=LandingHeroMetrics)
@limiter.limit("30/minute")
def get_landing_hero_metrics(
    request: Request,
    ticker: str = Query("AAPL", min_length=1, max_length=8),
) -> LandingHeroMetrics:
    ticker_upper = ticker.upper().strip()
    cache_key = ticker_upper
    now = time.time()

    if (
        _landing_metrics_cache["key"] == cache_key
        and now - float(_landing_metrics_cache["ts"]) < LANDING_METRICS_TTL_SECONDS
        and _landing_metrics_cache["value"] is not None
    ):
        return _landing_metrics_cache["value"]

    try:
        price_change, sparkline_prices = _compute_ticker_price_metrics(ticker_upper)
    except Exception as exc:
        logger.warning("Failed to compute ticker price metrics for %s: %s", ticker_upper, exc, exc_info=True)
        price_change, sparkline_prices = None, []

    try:
        daily_transactions = _compute_daily_transactions_24h()
    except Exception as exc:
        logger.warning("Failed to compute 24h transaction count: %s", exc, exc_info=True)
        daily_transactions = 0

    try:
        avg_lag_days, lag_sample_size = _compute_average_filing_lag_days()
    except Exception as exc:
        logger.warning("Failed to compute filing lag metrics: %s", exc, exc_info=True)
        avg_lag_days, lag_sample_size = None, 0

    metrics = LandingHeroMetrics(
        ticker=ticker_upper,
        price_change_percent_30d=price_change,
        sparkline_prices=sparkline_prices,
        daily_transactions_24h=daily_transactions,
        average_filing_lag_days=avg_lag_days,
        lag_sample_size=lag_sample_size,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )

    _landing_metrics_cache["key"] = cache_key
    _landing_metrics_cache["ts"] = now
    _landing_metrics_cache["value"] = metrics
    return metrics
