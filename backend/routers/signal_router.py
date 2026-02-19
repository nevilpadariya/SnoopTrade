from __future__ import annotations

import hashlib
import math
from bisect import bisect_left
from datetime import date, datetime, timedelta, timezone
from statistics import median
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator

from database.database import stock_db, user_db
from services.auth_services import decode_access_token
from services.sec_service import get_all_transactions
from utils.limiter import limiter

signal_router = APIRouter(prefix="/signals")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

DEFAULT_TODAY_TICKERS = ["AAPL", "MSFT", "NVDA", "AMZN", "META"]
MAX_TODAY_TICKERS = 20
MAX_WATCHLIST_GROUPS = 8
MAX_GROUP_NAME_LENGTH = 24
TODAY_PERSONALIZATION_LOOKBACK_DAYS = 120
MAX_PERSONALIZATION_DELTA = 12.0
MIN_PERSONALIZATION_STRENGTH = 0.0
MAX_PERSONALIZATION_STRENGTH = 3.0
OUTCOME_WEIGHT_BY_TYPE: dict[str, float] = {
    "followed": 1.8,
    "entered": 2.8,
    "ignored": -1.2,
    "exited": -2.2,
}
TICKER_SECTOR_MAP: dict[str, str] = {
    "AAPL": "Technology",
    "MSFT": "Technology",
    "NVDA": "Technology",
    "GOOGL": "Communication Services",
    "META": "Communication Services",
    "AMZN": "Consumer Discretionary",
    "TSLA": "Consumer Discretionary",
    "NFLX": "Communication Services",
    "JPM": "Financials",
    "JNJ": "Healthcare",
    "V": "Financials",
    "UNH": "Healthcare",
    "HD": "Consumer Discretionary",
    "DIS": "Communication Services",
    "BAC": "Financials",
    "XOM": "Energy",
    "PG": "Consumer Staples",
    "MA": "Financials",
    "PEP": "Consumer Staples",
    "WMT": "Consumer Staples",
}
DEFAULT_PERSONALIZATION_SETTINGS: dict[str, Any] = {
    "enabled": True,
    "strength": 1.0,
    "lookback_days": TODAY_PERSONALIZATION_LOOKBACK_DAYS,
}


class ConvictionScoreResponse(BaseModel):
    ticker: str
    lookback_days: int
    score: float = Field(ge=0, le=100)
    label: str
    purchases: int
    sales: int
    unique_buyers: int
    buy_sell_imbalance: float
    latest_buy_days_ago: int | None = None
    explanation: list[str]
    updated_at: str


class TodaySignalItem(BaseModel):
    signal_id: str
    ticker: str
    base_score: float = Field(ge=0, le=100)
    score: float = Field(ge=0, le=100)
    label: str
    urgency: Literal["high", "medium", "low"]
    personalization_delta: float = Field(ge=-MAX_PERSONALIZATION_DELTA, le=MAX_PERSONALIZATION_DELTA)
    personalization_samples: int = Field(ge=0)
    action: str
    reason: str
    change_24h: float
    confidence: float = Field(ge=0, le=1)
    one_line_explanation: str
    updated_at: str


class TodaySignalsResponse(BaseModel):
    lookback_days: int
    watchlist_only: bool
    watchlist_group: str | None = None
    evaluated: int
    generated_at: str
    items: list[TodaySignalItem]


class SignalDeltaResponse(BaseModel):
    ticker: str
    lookback_days: int
    score_prev: float = Field(ge=0, le=100)
    score_now: float = Field(ge=0, le=100)
    buyers_prev: int
    buyers_now: int
    net_flow_prev: float
    net_flow_now: float
    summary: str
    generated_at: str


class SignalExplainResponse(BaseModel):
    ticker: str
    lookback_days: int
    score: float = Field(ge=0, le=100)
    label: str
    action: str
    reason: str
    confidence: float = Field(ge=0, le=1)
    change_24h: float
    one_line_explanation: str
    key_factors: list[str]
    updated_at: str


class SignalBacktestPoint(BaseModel):
    signal_date: str
    entry_date: str | None = None
    exit_date: str | None = None
    entry_price: float | None = None
    exit_price: float | None = None
    return_pct: float | None = None
    shares: float


class SignalBacktestResponse(BaseModel):
    ticker: str
    lookback_days: int
    horizon_days: int
    signal_count: int
    sample_size: int
    win_rate: float | None = None
    average_return_pct: float | None = None
    median_return_pct: float | None = None
    best_return_pct: float | None = None
    worst_return_pct: float | None = None
    note: str
    generated_at: str
    points: list[SignalBacktestPoint]


class WatchlistRadarRequest(BaseModel):
    tickers: list[str] = Field(min_length=1, max_length=20)
    lookback_days: int = Field(default=30, ge=7, le=365)
    limit: int = Field(default=5, ge=1, le=10)

    @field_validator("tickers")
    @classmethod
    def normalize_tickers(cls, value: list[str]) -> list[str]:
        normalized = []
        seen = set()
        for ticker in value:
            if not ticker:
                continue
            cleaned = str(ticker).upper().strip()
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            normalized.append(cleaned)
        if not normalized:
            raise ValueError("At least one valid ticker is required.")
        return normalized[:20]


class WatchlistRadarItem(BaseModel):
    ticker: str
    score: float = Field(ge=0, le=100)
    label: str
    purchases: int
    sales: int
    unique_buyers: int
    latest_buy_days_ago: int | None = None
    explanation: list[str]


class SectorRollupItem(BaseModel):
    sector: str
    ticker_count: int
    average_score: float = Field(ge=0, le=100)
    top_ticker: str
    top_score: float = Field(ge=0, le=100)
    high_conviction_count: int
    risk_off_count: int


class WatchlistRadarResponse(BaseModel):
    lookback_days: int
    evaluated: int
    items: list[WatchlistRadarItem]
    sector_rollups: list[SectorRollupItem] = Field(default_factory=list)
    updated_at: str


class DailyBriefRequest(BaseModel):
    tickers: list[str] = Field(min_length=1, max_length=20)
    lookback_days: int = Field(default=30, ge=7, le=365)
    limit: int = Field(default=5, ge=1, le=10)

    @field_validator("tickers")
    @classmethod
    def normalize_tickers(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for ticker in value:
            cleaned = str(ticker or "").upper().strip()
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            normalized.append(cleaned)
        if not normalized:
            raise ValueError("At least one valid ticker is required.")
        return normalized[:20]


class DailyBriefItem(BaseModel):
    ticker: str
    score: float = Field(ge=0, le=100)
    label: str
    latest_buy_days_ago: int | None = None
    action: str
    reason: str


class DailyBriefResponse(BaseModel):
    lookback_days: int
    market_mood: str
    highest_conviction_ticker: str | None = None
    average_score: float
    items: list[DailyBriefItem]
    generated_at: str


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


def _tx_value(tx: Any, key: str) -> Any:
    if isinstance(tx, dict):
        return tx.get(key)
    return getattr(tx, key, None)


def _build_label(score: float) -> str:
    if score >= 70:
        return "Bullish"
    if score >= 55:
        return "Slightly Bullish"
    if score >= 45:
        return "Neutral"
    if score >= 30:
        return "Cautious"
    return "Bearish"


def _build_market_mood(average_score: float) -> str:
    if average_score >= 70:
        return "Risk-on"
    if average_score >= 55:
        return "Constructive"
    if average_score >= 45:
        return "Mixed"
    if average_score >= 30:
        return "Cautious"
    return "Defensive"


def _build_action_and_reason(
    conviction: ConvictionScoreResponse,
    *,
    score_override: float | None = None,
) -> tuple[str, str]:
    score = conviction.score if score_override is None else score_override
    latest_buy = conviction.latest_buy_days_ago

    if score >= 70:
        action = "Prioritize this ticker"
    elif score >= 55:
        action = "Monitor closely"
    elif score >= 45:
        action = "Neutral watch"
    else:
        action = "Risk-off"

    recency_fragment = (
        f"latest buy {latest_buy}d ago"
        if latest_buy is not None
        else "no recent insider buy"
    )
    reason = (
        f"{conviction.purchases} buys vs {conviction.sales} sales, "
        f"{conviction.unique_buyers} unique buyers, {recency_fragment}."
    )
    return action, reason


def _normalize_tickers(values: list[Any], max_items: int = MAX_TODAY_TICKERS) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw in values:
        ticker = str(raw or "").upper().strip()
        if not ticker or ticker in seen:
            continue
        if len(ticker) > 8:
            continue
        if not all(ch.isalnum() or ch in ".-" for ch in ticker):
            continue
        seen.add(ticker)
        normalized.append(ticker)
    return normalized[:max_items]


def _normalize_group_name(value: Any) -> str:
    compact = " ".join(str(value or "").strip().split())
    cleaned = "".join(ch for ch in compact if ch.isalnum() or ch in " -&_")
    return cleaned.strip()[:MAX_GROUP_NAME_LENGTH]


def _normalize_watchlist_groups(groups: Any, watchlist: list[str]) -> dict[str, list[str]]:
    if not isinstance(groups, dict):
        return {}

    allowed = set(watchlist)
    normalized: dict[str, list[str]] = {}
    seen_names: set[str] = set()

    for raw_name, raw_tickers in groups.items():
        name = _normalize_group_name(raw_name)
        if not name:
            continue

        lowered = name.lower()
        if lowered in seen_names:
            continue

        if not isinstance(raw_tickers, list):
            continue
        tickers = _normalize_tickers(raw_tickers, MAX_TODAY_TICKERS)
        tickers = [ticker for ticker in tickers if ticker in allowed]
        if not tickers:
            continue

        normalized[name] = tickers
        seen_names.add(lowered)
        if len(normalized) >= MAX_WATCHLIST_GROUPS:
            break

    return normalized


def _resolve_today_tickers(
    user_email: str,
    watchlist_only: bool,
    limit: int,
    watchlist_group: str | None = None,
) -> tuple[list[str], str | None]:
    user_doc = user_db["users"].find_one(
        {"email": user_email},
        {"_id": 0, "watchlist": 1, "recent_tickers": 1, "watchlist_groups": 1},
    )

    watchlist = _normalize_tickers((user_doc or {}).get("watchlist") or [], MAX_TODAY_TICKERS)
    recent_tickers = _normalize_tickers((user_doc or {}).get("recent_tickers") or [], MAX_TODAY_TICKERS)
    watchlist_groups = _normalize_watchlist_groups((user_doc or {}).get("watchlist_groups") or {}, watchlist)
    resolved_group: str | None = None

    requested_group = _normalize_group_name(watchlist_group or "")
    if requested_group and requested_group.lower() != "all":
        lowered_name_map = {name.lower(): name for name in watchlist_groups}
        matched_name = lowered_name_map.get(requested_group.lower())
        if matched_name is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist group not found.")
        watchlist = watchlist_groups.get(matched_name, [])
        resolved_group = matched_name

    if resolved_group:
        return watchlist[:limit], resolved_group

    if watchlist_only and watchlist:
        return watchlist[:limit], resolved_group

    if watchlist_only and not watchlist:
        return DEFAULT_TODAY_TICKERS[:limit], resolved_group

    combined = watchlist + [ticker for ticker in recent_tickers if ticker not in watchlist]
    combined.extend([ticker for ticker in DEFAULT_TODAY_TICKERS if ticker not in combined])

    return combined[:limit], resolved_group


def _window_bounds(lookback_days: int, *, offset_days: int = 0) -> tuple[date, date]:
    reference_day = datetime.now(timezone.utc).date() - timedelta(days=max(0, offset_days))
    start_day = reference_day - timedelta(days=max(1, lookback_days) - 1)
    return start_day, reference_day


def _collect_metrics(
    transactions: list[Any],
    *,
    start_day: date,
    end_day: date,
) -> dict[str, Any]:
    buys: list[dict[str, Any]] = []
    sells: list[dict[str, Any]] = []

    for tx in transactions:
        code = str(_tx_value(tx, "transaction_code") or "").upper().strip()
        tx_day = _parse_day(_tx_value(tx, "transaction_date"))
        if tx_day is None or tx_day < start_day or tx_day > end_day:
            continue

        row = {
            "day": tx_day,
            "owner": str(_tx_value(tx, "reporting_owner_name") or "Unknown Insider").strip(),
            "shares": max(0.0, _parse_number(_tx_value(tx, "shares"))),
        }

        if code == "P":
            buys.append(row)
        elif code == "S":
            sells.append(row)

    purchase_count = len(buys)
    sale_count = len(sells)
    unique_buyers = len({row["owner"] for row in buys})

    buy_shares = sum(row["shares"] for row in buys)
    sell_shares = sum(row["shares"] for row in sells)
    total_shares = buy_shares + sell_shares
    imbalance = 0.0 if total_shares == 0 else (buy_shares - sell_shares) / total_shares

    latest_buy_day = max((row["day"] for row in buys), default=None)

    return {
        "purchases": purchase_count,
        "sales": sale_count,
        "unique_buyers": unique_buyers,
        "buy_shares": buy_shares,
        "sell_shares": sell_shares,
        "buy_sell_imbalance": imbalance,
        "latest_buy_day": latest_buy_day,
    }


def _build_conviction_from_metrics(
    *,
    ticker_upper: str,
    lookback_days: int,
    metrics: dict[str, Any],
    reference_day: date,
) -> ConvictionScoreResponse:
    purchase_count = int(metrics.get("purchases", 0))
    sale_count = int(metrics.get("sales", 0))
    unique_buyers = int(metrics.get("unique_buyers", 0))
    imbalance = float(metrics.get("buy_sell_imbalance", 0.0))
    latest_buy_day = metrics.get("latest_buy_day")

    imbalance_score = ((imbalance + 1.0) / 2.0) * 100.0

    latest_buy_days_ago: int | None = None
    recency_score = 0.0
    if latest_buy_day is not None:
        latest_buy_days_ago = max(0, (reference_day - latest_buy_day).days)
        recency_score = max(0.0, 100.0 - (latest_buy_days_ago * 4.0))

    participation_score = min(100.0, unique_buyers * 20.0)
    activity_score = min(100.0, (purchase_count + sale_count) * 8.0)

    weighted_score = (
        imbalance_score * 0.35
        + recency_score * 0.25
        + participation_score * 0.25
        + activity_score * 0.15
    )
    score = round(max(0.0, min(100.0, weighted_score)), 2)

    explanation: list[str] = []
    explanation.append(f"Purchases vs sales count: {purchase_count}:{sale_count}.")
    explanation.append(f"Unique insider buyers in window: {unique_buyers}.")
    if latest_buy_days_ago is not None:
        explanation.append(f"Most recent insider buy was {latest_buy_days_ago} day(s) ago.")
    else:
        explanation.append("No insider buys in the selected lookback window.")

    return ConvictionScoreResponse(
        ticker=ticker_upper,
        lookback_days=lookback_days,
        score=score,
        label=_build_label(score),
        purchases=purchase_count,
        sales=sale_count,
        unique_buyers=unique_buyers,
        buy_sell_imbalance=round(imbalance, 4),
        latest_buy_days_ago=latest_buy_days_ago,
        explanation=explanation,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


def _compute_conviction_for_window(
    *,
    ticker_upper: str,
    lookback_days: int,
    transactions: list[Any],
    offset_days: int,
) -> tuple[ConvictionScoreResponse, dict[str, Any]]:
    start_day, end_day = _window_bounds(lookback_days, offset_days=offset_days)
    metrics = _collect_metrics(transactions, start_day=start_day, end_day=end_day)
    conviction = _build_conviction_from_metrics(
        ticker_upper=ticker_upper,
        lookback_days=lookback_days,
        metrics=metrics,
        reference_day=end_day,
    )
    return conviction, metrics


def _compute_conviction_from_transactions(
    *,
    ticker_upper: str,
    lookback_days: int,
    transactions: list[Any],
) -> ConvictionScoreResponse:
    conviction, _ = _compute_conviction_for_window(
        ticker_upper=ticker_upper,
        lookback_days=lookback_days,
        transactions=transactions,
        offset_days=0,
    )
    return conviction


def _confidence_from_conviction(conviction: ConvictionScoreResponse) -> float:
    participation_component = min(1.0, conviction.unique_buyers / 5.0)
    activity_component = min(1.0, (conviction.purchases + conviction.sales) / 10.0)
    imbalance_component = min(1.0, abs(conviction.buy_sell_imbalance))
    recency_component = 0.0
    if conviction.latest_buy_days_ago is not None:
        recency_component = max(0.0, 1.0 - (conviction.latest_buy_days_ago / 45.0))

    confidence = (
        participation_component * 0.35
        + activity_component * 0.25
        + imbalance_component * 0.2
        + recency_component * 0.2
    )
    return round(max(0.0, min(1.0, confidence)), 2)


def _build_urgency(score: float, change_24h: float, confidence: float) -> Literal["high", "medium", "low"]:
    if score >= 70 or (change_24h >= 8 and confidence >= 0.55):
        return "high"
    if score >= 55 or (change_24h >= 3 and confidence >= 0.35):
        return "medium"
    return "low"


def _priority_rank(urgency: Literal["high", "medium", "low"]) -> int:
    if urgency == "high":
        return 3
    if urgency == "medium":
        return 2
    return 1


def _build_delta_summary(
    *,
    ticker: str,
    score_prev: float,
    score_now: float,
    buyers_prev: int,
    buyers_now: int,
    net_flow_prev: float,
    net_flow_now: float,
) -> str:
    score_change = score_now - score_prev
    direction = "increased" if score_change >= 0 else "decreased"
    buyers_direction = "up" if buyers_now >= buyers_prev else "down"
    flow_direction = "stronger" if net_flow_now >= net_flow_prev else "weaker"

    return (
        f"{ticker} conviction {direction} {abs(score_change):.2f} points; "
        f"insider buyers {buyers_direction} ({buyers_prev} to {buyers_now}) and "
        f"net insider flow is {flow_direction}."
    )


def _safe_utc_datetime(value: Any) -> datetime | None:
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


def _clamp_score(value: float, *, min_value: float = 0.0, max_value: float = 100.0) -> float:
    return round(max(min_value, min(max_value, value)), 2)


def _load_personalization_settings(user_email: str) -> dict[str, Any]:
    doc = user_db["user_preferences"].find_one(
        {"user_email": user_email},
        {"_id": 0, "enabled": 1, "strength": 1, "lookback_days": 1},
    ) or {}

    enabled_raw = doc.get("enabled", DEFAULT_PERSONALIZATION_SETTINGS["enabled"])
    enabled = bool(enabled_raw) if isinstance(enabled_raw, bool) else bool(DEFAULT_PERSONALIZATION_SETTINGS["enabled"])

    try:
        strength = float(doc.get("strength", DEFAULT_PERSONALIZATION_SETTINGS["strength"]))
    except (TypeError, ValueError):
        strength = float(DEFAULT_PERSONALIZATION_SETTINGS["strength"])
    strength = max(MIN_PERSONALIZATION_STRENGTH, min(MAX_PERSONALIZATION_STRENGTH, strength))

    try:
        lookback_days = int(doc.get("lookback_days", DEFAULT_PERSONALIZATION_SETTINGS["lookback_days"]))
    except (TypeError, ValueError):
        lookback_days = int(DEFAULT_PERSONALIZATION_SETTINGS["lookback_days"])
    lookback_days = max(30, min(365, lookback_days))

    return {
        "enabled": enabled,
        "strength": strength,
        "lookback_days": lookback_days,
    }


def _load_personalization_by_ticker(
    *,
    user_email: str,
    tickers: list[str],
    lookback_days: int = TODAY_PERSONALIZATION_LOOKBACK_DAYS,
    strength: float = 1.0,
) -> dict[str, dict[str, float | int]]:
    if not tickers:
        return {}

    since = datetime.now(timezone.utc) - timedelta(days=max(1, lookback_days))
    docs = user_db["user_outcomes"].find(
        {
            "user_email": user_email,
            "ticker": {"$in": tickers},
            "created_at": {"$gte": since},
        },
        {"_id": 0, "ticker": 1, "outcome_type": 1, "timestamp": 1, "created_at": 1},
    )

    now = datetime.now(timezone.utc)
    score_by_ticker: dict[str, float] = {ticker: 0.0 for ticker in tickers}
    samples_by_ticker: dict[str, int] = {ticker: 0 for ticker in tickers}

    for doc in docs:
        ticker = str(doc.get("ticker") or "").upper().strip()
        if not ticker or ticker not in score_by_ticker:
            continue

        outcome_type = str(doc.get("outcome_type") or "").lower().strip()
        outcome_weight = OUTCOME_WEIGHT_BY_TYPE.get(outcome_type, 0.0)
        if outcome_weight == 0.0:
            continue

        reference_ts = _safe_utc_datetime(doc.get("timestamp")) or _safe_utc_datetime(doc.get("created_at")) or now
        age_days = max(0.0, (now - reference_ts).total_seconds() / 86400.0)

        # Exponential decay with half-life around 30 days.
        recency_decay = math.exp(-age_days / 30.0)
        score_by_ticker[ticker] += outcome_weight * recency_decay
        samples_by_ticker[ticker] += 1

    clamped_strength = max(MIN_PERSONALIZATION_STRENGTH, min(MAX_PERSONALIZATION_STRENGTH, float(strength)))
    result: dict[str, dict[str, float | int]] = {}
    for ticker in tickers:
        raw_delta = score_by_ticker.get(ticker, 0.0) * clamped_strength
        clamped_delta = max(-MAX_PERSONALIZATION_DELTA, min(MAX_PERSONALIZATION_DELTA, raw_delta))
        result[ticker] = {
            "delta": round(clamped_delta, 2),
            "samples": int(samples_by_ticker.get(ticker, 0)),
        }
    return result


def _sector_for_ticker(ticker: str) -> str:
    return TICKER_SECTOR_MAP.get(ticker.upper().strip(), "Other")


def _build_sector_rollups(items: list[WatchlistRadarItem]) -> list[SectorRollupItem]:
    grouped: dict[str, list[WatchlistRadarItem]] = {}
    for item in items:
        sector = _sector_for_ticker(item.ticker)
        grouped.setdefault(sector, []).append(item)

    rollups: list[SectorRollupItem] = []
    for sector, rows in grouped.items():
        if not rows:
            continue
        average_score = round(sum(row.score for row in rows) / len(rows), 2)
        top_item = max(rows, key=lambda row: row.score)
        high_conviction_count = sum(1 for row in rows if row.score >= 55)
        risk_off_count = sum(1 for row in rows if row.score < 45)
        rollups.append(
            SectorRollupItem(
                sector=sector,
                ticker_count=len(rows),
                average_score=average_score,
                top_ticker=top_item.ticker,
                top_score=round(top_item.score, 2),
                high_conviction_count=high_conviction_count,
                risk_off_count=risk_off_count,
            )
        )

    rollups.sort(
        key=lambda row: (
            row.average_score,
            row.ticker_count,
            row.top_score,
        ),
        reverse=True,
    )
    return rollups


def _parse_stock_day(value: Any) -> date | None:
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
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
        except Exception:
            if len(text) >= 10:
                text = text[:10]
            try:
                return datetime.strptime(text, "%Y-%m-%d").date()
            except ValueError:
                return None
    return None


def _load_close_series(ticker: str, start_day: date) -> tuple[list[date], list[float]]:
    collection = stock_db[f"stock_data_{ticker}"]
    start_dt = datetime(start_day.year, start_day.month, start_day.day)
    docs = (
        collection.find({"Date": {"$gte": start_dt}}, {"_id": 0, "Date": 1, "Close": 1})
        .sort("Date", 1)
    )

    days: list[date] = []
    closes: list[float] = []
    for doc in docs:
        day = _parse_stock_day(doc.get("Date"))
        close = _parse_number(doc.get("Close"))
        if day is None or close <= 0:
            continue
        days.append(day)
        closes.append(close)

    return days, closes


def _price_on_or_after(days: list[date], closes: list[float], target_day: date) -> tuple[date, float] | None:
    if not days or not closes or len(days) != len(closes):
        return None
    index = bisect_left(days, target_day)
    if index >= len(days):
        return None
    return days[index], closes[index]


def _extract_backtest_buy_signals(
    transactions: list[Any],
    *,
    since_day: date,
    min_shares: float,
    max_signals: int,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for tx in transactions:
        code = str(_tx_value(tx, "transaction_code") or "").upper().strip()
        if code != "P":
            continue
        tx_day = _parse_day(_tx_value(tx, "transaction_date"))
        if tx_day is None or tx_day < since_day:
            continue
        shares = max(0.0, _parse_number(_tx_value(tx, "shares")))
        if shares < min_shares:
            continue
        candidates.append(
            {
                "signal_day": tx_day,
                "shares": shares,
            }
        )

    candidates.sort(key=lambda row: row["signal_day"], reverse=True)
    return candidates[:max_signals]


@signal_router.get("/conviction/{ticker}", response_model=ConvictionScoreResponse)
@limiter.limit("60/minute")
def get_conviction_score(
    request: Request,
    ticker: str,
    lookback_days: int = Query(30, ge=7, le=365),
    user_email: str = Depends(_get_user_email),
) -> ConvictionScoreResponse:
    _ = user_email
    ticker_upper = ticker.upper().strip()
    transactions = get_all_transactions(ticker_upper, _period_for_days(lookback_days)) or []
    return _compute_conviction_from_transactions(
        ticker_upper=ticker_upper,
        lookback_days=lookback_days,
        transactions=transactions,
    )


@signal_router.get("/today", response_model=TodaySignalsResponse)
@limiter.limit("40/minute")
def get_today_signals(
    request: Request,
    watchlist_only: bool = Query(True),
    lookback_days: int = Query(30, ge=7, le=365),
    limit: int = Query(10, ge=1, le=20),
    watchlist_group: str | None = Query(None, max_length=64),
    user_email: str = Depends(_get_user_email),
) -> TodaySignalsResponse:
    tickers, resolved_group = _resolve_today_tickers(
        user_email=user_email,
        watchlist_only=watchlist_only,
        limit=limit,
        watchlist_group=watchlist_group,
    )
    personalization_settings = _load_personalization_settings(user_email)
    personalization_enabled = bool(personalization_settings.get("enabled", True))
    personalization_strength = float(personalization_settings.get("strength", 1.0))
    personalization_lookback = int(personalization_settings.get("lookback_days", TODAY_PERSONALIZATION_LOOKBACK_DAYS))
    personalization = _load_personalization_by_ticker(
        user_email=user_email,
        tickers=tickers,
        lookback_days=personalization_lookback,
        strength=personalization_strength,
    ) if personalization_enabled and personalization_strength > 0 else {ticker: {"delta": 0.0, "samples": 0} for ticker in tickers}
    items: list[TodaySignalItem] = []

    for ticker in tickers:
        period = _period_for_days(min(365, (lookback_days * 2) + 2))
        transactions = get_all_transactions(ticker, period) or []

        now_conviction, _ = _compute_conviction_for_window(
            ticker_upper=ticker,
            lookback_days=lookback_days,
            transactions=transactions,
            offset_days=0,
        )
        prev_conviction, _ = _compute_conviction_for_window(
            ticker_upper=ticker,
            lookback_days=lookback_days,
            transactions=transactions,
            offset_days=1,
        )

        change_24h = round(now_conviction.score - prev_conviction.score, 2)
        personalization_entry = personalization.get(ticker) or {}
        personalization_delta = float(personalization_entry.get("delta", 0.0))
        personalization_samples = int(personalization_entry.get("samples", 0))
        personalized_score = _clamp_score(now_conviction.score + personalization_delta)
        action, reason = _build_action_and_reason(now_conviction, score_override=personalized_score)

        confidence = _confidence_from_conviction(now_conviction)
        urgency = _build_urgency(personalized_score, change_24h, confidence)
        signal_id = hashlib.sha1(
            f"{user_email}|{ticker}|{lookback_days}|{now_conviction.updated_at[:10]}".encode("utf-8")
        ).hexdigest()[:20]

        one_line_explanation = now_conviction.explanation[0] if now_conviction.explanation else "No signal explanation available."
        if personalization_samples > 0 and abs(personalization_delta) >= 0.05:
            sign = "+" if personalization_delta >= 0 else ""
            one_line_explanation = (
                f"{one_line_explanation} Personalization {sign}{personalization_delta:.2f} from your recent outcomes."
            )

        items.append(
            TodaySignalItem(
                signal_id=signal_id,
                ticker=ticker,
                base_score=now_conviction.score,
                score=personalized_score,
                label=_build_label(personalized_score),
                urgency=urgency,
                personalization_delta=round(personalization_delta, 2),
                personalization_samples=personalization_samples,
                action=action,
                reason=reason,
                change_24h=change_24h,
                confidence=confidence,
                one_line_explanation=one_line_explanation,
                updated_at=now_conviction.updated_at,
            )
        )

    items.sort(
        key=lambda item: (
            _priority_rank(item.urgency),
            item.score,
            item.change_24h,
            item.confidence,
        ),
        reverse=True,
    )

    return TodaySignalsResponse(
        lookback_days=lookback_days,
        watchlist_only=watchlist_only,
        watchlist_group=resolved_group,
        evaluated=len(tickers),
        generated_at=datetime.now(timezone.utc).isoformat(),
        items=items[:limit],
    )


@signal_router.get("/delta/{ticker}", response_model=SignalDeltaResponse)
@limiter.limit("60/minute")
def get_signal_delta(
    request: Request,
    ticker: str,
    lookback_days: int = Query(30, ge=7, le=365),
    user_email: str = Depends(_get_user_email),
) -> SignalDeltaResponse:
    _ = user_email
    ticker_upper = ticker.upper().strip()

    period = _period_for_days(min(365, (lookback_days * 2) + 2))
    transactions = get_all_transactions(ticker_upper, period) or []

    conviction_now, metrics_now = _compute_conviction_for_window(
        ticker_upper=ticker_upper,
        lookback_days=lookback_days,
        transactions=transactions,
        offset_days=0,
    )
    conviction_prev, metrics_prev = _compute_conviction_for_window(
        ticker_upper=ticker_upper,
        lookback_days=lookback_days,
        transactions=transactions,
        offset_days=1,
    )

    net_flow_prev = round(float(metrics_prev.get("buy_shares", 0.0)) - float(metrics_prev.get("sell_shares", 0.0)), 2)
    net_flow_now = round(float(metrics_now.get("buy_shares", 0.0)) - float(metrics_now.get("sell_shares", 0.0)), 2)

    return SignalDeltaResponse(
        ticker=ticker_upper,
        lookback_days=lookback_days,
        score_prev=conviction_prev.score,
        score_now=conviction_now.score,
        buyers_prev=int(metrics_prev.get("unique_buyers", 0)),
        buyers_now=int(metrics_now.get("unique_buyers", 0)),
        net_flow_prev=net_flow_prev,
        net_flow_now=net_flow_now,
        summary=_build_delta_summary(
            ticker=ticker_upper,
            score_prev=conviction_prev.score,
            score_now=conviction_now.score,
            buyers_prev=int(metrics_prev.get("unique_buyers", 0)),
            buyers_now=int(metrics_now.get("unique_buyers", 0)),
            net_flow_prev=net_flow_prev,
            net_flow_now=net_flow_now,
        ),
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@signal_router.get("/explain/{ticker}", response_model=SignalExplainResponse)
@limiter.limit("60/minute")
def get_signal_explain(
    request: Request,
    ticker: str,
    lookback_days: int = Query(30, ge=7, le=365),
    user_email: str = Depends(_get_user_email),
) -> SignalExplainResponse:
    _ = user_email
    ticker_upper = ticker.upper().strip()

    period = _period_for_days(min(365, (lookback_days * 2) + 2))
    transactions = get_all_transactions(ticker_upper, period) or []

    conviction_now = _compute_conviction_from_transactions(
        ticker_upper=ticker_upper,
        lookback_days=lookback_days,
        transactions=transactions,
    )
    conviction_prev, _ = _compute_conviction_for_window(
        ticker_upper=ticker_upper,
        lookback_days=lookback_days,
        transactions=transactions,
        offset_days=1,
    )

    action, reason = _build_action_and_reason(conviction_now)
    change_24h = round(conviction_now.score - conviction_prev.score, 2)
    confidence = _confidence_from_conviction(conviction_now)

    key_factors: list[str] = [
        f"Buy/Sell imbalance: {conviction_now.buy_sell_imbalance:.2f}",
        f"Unique insider buyers: {conviction_now.unique_buyers}",
        (
            f"Latest insider buy: {conviction_now.latest_buy_days_ago} day(s) ago"
            if conviction_now.latest_buy_days_ago is not None
            else "No recent insider buy in selected window"
        ),
        f"24h score change: {change_24h:+.2f}",
    ]

    return SignalExplainResponse(
        ticker=ticker_upper,
        lookback_days=lookback_days,
        score=conviction_now.score,
        label=conviction_now.label,
        action=action,
        reason=reason,
        confidence=confidence,
        change_24h=change_24h,
        one_line_explanation=conviction_now.explanation[0] if conviction_now.explanation else "No explanation available.",
        key_factors=key_factors,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@signal_router.get("/backtest/{ticker}", response_model=SignalBacktestResponse)
@limiter.limit("40/minute")
def get_signal_backtest(
    request: Request,
    ticker: str,
    lookback_days: int = Query(365, ge=30, le=1095),
    horizon_days: int = Query(20, ge=1, le=90),
    min_shares: float = Query(0.0, ge=0),
    max_signals: int = Query(120, ge=10, le=500),
    user_email: str = Depends(_get_user_email),
) -> SignalBacktestResponse:
    _ = user_email
    ticker_upper = ticker.upper().strip()
    since_day = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).date()

    transactions = get_all_transactions(ticker_upper, None) or []
    signals = _extract_backtest_buy_signals(
        transactions,
        since_day=since_day,
        min_shares=min_shares,
        max_signals=max_signals,
    )

    if not signals:
        return SignalBacktestResponse(
            ticker=ticker_upper,
            lookback_days=lookback_days,
            horizon_days=horizon_days,
            signal_count=0,
            sample_size=0,
            win_rate=None,
            average_return_pct=None,
            median_return_pct=None,
            best_return_pct=None,
            worst_return_pct=None,
            note="No insider buy signals matched the selected filters.",
            generated_at=datetime.now(timezone.utc).isoformat(),
            points=[],
        )

    price_days, price_closes = _load_close_series(
        ticker_upper,
        start_day=since_day - timedelta(days=7),
    )

    points: list[SignalBacktestPoint] = []
    returns: list[float] = []

    for signal in signals:
        signal_day = signal["signal_day"]
        entry = _price_on_or_after(price_days, price_closes, signal_day)
        exit_target = signal_day + timedelta(days=horizon_days)
        exit_point = _price_on_or_after(price_days, price_closes, exit_target)

        if entry is None or exit_point is None:
            continue

        entry_day, entry_price = entry
        exit_day, exit_price = exit_point
        if entry_price <= 0:
            continue

        return_pct = ((exit_price - entry_price) / entry_price) * 100.0
        returns.append(return_pct)
        points.append(
            SignalBacktestPoint(
                signal_date=signal_day.isoformat(),
                entry_date=entry_day.isoformat(),
                exit_date=exit_day.isoformat(),
                entry_price=round(entry_price, 4),
                exit_price=round(exit_price, 4),
                return_pct=round(return_pct, 4),
                shares=round(float(signal["shares"]), 4),
            )
        )

    if not points:
        return SignalBacktestResponse(
            ticker=ticker_upper,
            lookback_days=lookback_days,
            horizon_days=horizon_days,
            signal_count=len(signals),
            sample_size=0,
            win_rate=None,
            average_return_pct=None,
            median_return_pct=None,
            best_return_pct=None,
            worst_return_pct=None,
            note="Backtest signals found, but insufficient stock prices to evaluate returns.",
            generated_at=datetime.now(timezone.utc).isoformat(),
            points=[],
        )

    win_rate = (sum(1 for item in returns if item > 0) / len(returns)) * 100.0
    avg_return = sum(returns) / len(returns)
    median_return = float(median(returns))
    best_return = max(returns)
    worst_return = min(returns)

    points.sort(key=lambda row: row.signal_date, reverse=True)

    return SignalBacktestResponse(
        ticker=ticker_upper,
        lookback_days=lookback_days,
        horizon_days=horizon_days,
        signal_count=len(signals),
        sample_size=len(points),
        win_rate=round(win_rate, 2),
        average_return_pct=round(avg_return, 4),
        median_return_pct=round(median_return, 4),
        best_return_pct=round(best_return, 4),
        worst_return_pct=round(worst_return, 4),
        note="Lightweight historical check of insider buy signals versus forward price returns.",
        generated_at=datetime.now(timezone.utc).isoformat(),
        points=points[:80],
    )


@signal_router.post("/watchlist-radar", response_model=WatchlistRadarResponse)
@limiter.limit("30/minute")
def get_watchlist_radar(
    request: Request,
    payload: WatchlistRadarRequest,
    user_email: str = Depends(_get_user_email),
) -> WatchlistRadarResponse:
    _ = user_email
    period = _period_for_days(payload.lookback_days)
    scored: list[WatchlistRadarItem] = []

    for ticker in payload.tickers:
        transactions = get_all_transactions(ticker, period) or []
        conviction = _compute_conviction_from_transactions(
            ticker_upper=ticker,
            lookback_days=payload.lookback_days,
            transactions=transactions,
        )
        scored.append(
            WatchlistRadarItem(
                ticker=conviction.ticker,
                score=conviction.score,
                label=conviction.label,
                purchases=conviction.purchases,
                sales=conviction.sales,
                unique_buyers=conviction.unique_buyers,
                latest_buy_days_ago=conviction.latest_buy_days_ago,
                explanation=conviction.explanation,
            )
        )

    scored.sort(
        key=lambda item: (
            item.score,
            item.unique_buyers,
            item.purchases,
            -(item.latest_buy_days_ago or 9999),
        ),
        reverse=True,
    )

    sector_rollups = _build_sector_rollups(scored)

    return WatchlistRadarResponse(
        lookback_days=payload.lookback_days,
        evaluated=len(payload.tickers),
        items=scored[: payload.limit],
        sector_rollups=sector_rollups,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@signal_router.post("/daily-brief", response_model=DailyBriefResponse)
@limiter.limit("20/minute")
def get_daily_brief(
    request: Request,
    payload: DailyBriefRequest,
    user_email: str = Depends(_get_user_email),
) -> DailyBriefResponse:
    _ = user_email
    period = _period_for_days(payload.lookback_days)
    convictions: list[ConvictionScoreResponse] = []

    for ticker in payload.tickers:
        transactions = get_all_transactions(ticker, period) or []
        conviction = _compute_conviction_from_transactions(
            ticker_upper=ticker,
            lookback_days=payload.lookback_days,
            transactions=transactions,
        )
        convictions.append(conviction)

    convictions.sort(
        key=lambda item: (
            item.score,
            item.unique_buyers,
            item.purchases,
            -(item.latest_buy_days_ago or 9999),
        ),
        reverse=True,
    )

    top = convictions[: payload.limit]
    items: list[DailyBriefItem] = []
    for conviction in top:
        action, reason = _build_action_and_reason(conviction)
        items.append(
            DailyBriefItem(
                ticker=conviction.ticker,
                score=conviction.score,
                label=conviction.label,
                latest_buy_days_ago=conviction.latest_buy_days_ago,
                action=action,
                reason=reason,
            )
        )

    average_score = round(
        sum(item.score for item in convictions) / len(convictions), 2
    ) if convictions else 0.0
    highest = top[0].ticker if top else None

    return DailyBriefResponse(
        lookback_days=payload.lookback_days,
        market_mood=_build_market_mood(average_score),
        highest_conviction_ticker=highest,
        average_score=average_score,
        items=items,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
