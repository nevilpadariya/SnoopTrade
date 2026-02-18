from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator

from services.auth_services import decode_access_token
from services.sec_service import get_all_transactions
from utils.limiter import limiter

signal_router = APIRouter(prefix="/signals")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


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


class WatchlistRadarResponse(BaseModel):
    lookback_days: int
    evaluated: int
    items: list[WatchlistRadarItem]
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


def _build_action_and_reason(conviction: ConvictionScoreResponse) -> tuple[str, str]:
    score = conviction.score
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


def _compute_conviction_from_transactions(
    *,
    ticker_upper: str,
    lookback_days: int,
    transactions: list[Any],
) -> ConvictionScoreResponse:
    since_day = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).date()
    buys = []
    sells = []

    for tx in transactions:
        code = str(getattr(tx, "transaction_code", "") or "").upper().strip()
        tx_day = _parse_day(getattr(tx, "transaction_date", None))
        if tx_day is None or tx_day < since_day:
            continue

        row = {
            "day": tx_day,
            "owner": str(getattr(tx, "reporting_owner_name", "") or "Unknown Insider").strip(),
            "shares": _parse_number(getattr(tx, "shares", 0)),
        }
        if code == "P":
            buys.append(row)
        elif code == "S":
            sells.append(row)

    purchase_count = len(buys)
    sale_count = len(sells)
    unique_buyers = len({row["owner"] for row in buys})

    buy_shares = max(0.0, sum(row["shares"] for row in buys))
    sell_shares = max(0.0, sum(row["shares"] for row in sells))
    total_shares = buy_shares + sell_shares
    imbalance = 0.0 if total_shares == 0 else (buy_shares - sell_shares) / total_shares
    imbalance_score = ((imbalance + 1.0) / 2.0) * 100.0

    latest_buy_days_ago: int | None = None
    recency_score = 0.0
    if buys:
        latest_buy_day = max(row["day"] for row in buys)
        latest_buy_days_ago = max(0, (datetime.now(timezone.utc).date() - latest_buy_day).days)
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

    return WatchlistRadarResponse(
        lookback_days=payload.lookback_days,
        evaluated=len(payload.tickers),
        items=scored[: payload.limit],
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
