"""
Admin router for scheduler management and per-ticker updates via external cron.
"""

import os
import gc
import logging
import secrets
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends, status
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from database.database import user_db as db
from services.auth_services import decode_access_token
from scheduler import (
    get_scheduled_jobs,
    trigger_stock_update_now,
    trigger_sec_update_now,
    trigger_alert_scan_now,
    trigger_daily_digest_now,
    trigger_event_bus_dlq_retry_now,
)
from services.event_bus import (
    get_event_bus_status,
    list_event_bus_dead_letters,
    retry_failed_event_bus_dead_letters,
    retry_event_bus_dead_letter,
)
from services.ops_events_service import list_ops_events
from services.admin_access import is_admin_user

logger = logging.getLogger(__name__)

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
OAUTH2_OPTIONAL = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "").strip()
ALLOW_INSECURE_ADMIN = os.getenv("ALLOW_INSECURE_ADMIN", "false").strip().lower() == "true"

VALID_TICKERS = [
    "AAPL", "NVDA", "META", "GOOGL", "MSFT", "AMZN", "TSLA", "NFLX",
    "JPM", "JNJ", "V", "UNH", "HD", "DIS", "BAC", "XOM", "PG", "MA", "PEP", "WMT",
]

TICKER_CIK_MAPPING = {
    "AAPL": "0000320193",
    "NVDA": "0001045810",
    "META": "0001326801",
    "GOOGL": "0001652044",
    "MSFT": "0000789019",
    "AMZN": "0001018724",
    "TSLA": "0001318605",
    "NFLX": "0001065280",
    "JPM": "0000019617",
    "JNJ": "0000200406",
    "V": "0001403161",
    "UNH": "0000731766",
    "HD": "0000354950",
    "DIS": "0001744489",
    "BAC": "0000070858",
    "XOM": "0000034088",
    "PG": "0000080424",
    "MA": "0001141391",
    "PEP": "0000077476",
    "WMT": "0000104169",
}


async def verify_admin_access(
    api_key_header: Optional[str] = Depends(API_KEY_HEADER),
    bearer_token: Optional[str] = Depends(OAUTH2_OPTIONAL),
):
    """
    Allow either:
    1) X-API-Key (for cron/infrastructure), or
    2) Bearer token for a user with admin role/flag.
    """
    # Legacy/local development fallback.
    if ALLOW_INSECURE_ADMIN and not ADMIN_API_KEY:
        return {"auth": "insecure"}

    if ADMIN_API_KEY and api_key_header and secrets.compare_digest(api_key_header, ADMIN_API_KEY):
        return {"auth": "api_key"}

    if bearer_token:
        payload = decode_access_token(bearer_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid bearer token.",
            )
        email = str(payload.get("sub") or "").strip().lower()
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid bearer token payload.",
            )

        user = db.users.find_one({"email": email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found.",
            )

        if not is_admin_user(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required.",
            )
        return {"auth": "bearer", "email": email}

    if ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid admin credentials.",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin credentials required. Use X-API-Key or an admin bearer token.",
    )


admin_router = APIRouter(dependencies=[Depends(verify_admin_access)])


def validate_ticker(ticker: str) -> str:
    """Validate and normalize ticker symbol."""
    ticker = ticker.upper().strip()
    if ticker not in VALID_TICKERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ticker. Must be one of: {', '.join(VALID_TICKERS)}"
        )
    return ticker


@admin_router.get("/jobs")
async def list_scheduled_jobs():
    """
    List all scheduled jobs and their next run times.
    """
    jobs = get_scheduled_jobs()
    return {
        "status": "ok",
        "jobs": jobs
    }


@admin_router.get("/event-bus")
async def event_bus_status():
    """
    Show current event bus backend and runtime status.
    """
    return {
        "status": "ok",
        "event_bus": get_event_bus_status(),
    }


@admin_router.get("/event-bus/dead-letters")
async def event_bus_dead_letters(
    limit: int = Query(25, ge=1, le=200),
    status: str | None = Query(None, description="Filter by dead-letter status."),
):
    items = list_event_bus_dead_letters(limit=limit, status=status)
    return {
        "status": "ok",
        "count": len(items),
        "items": items,
    }


@admin_router.post("/event-bus/dead-letters/{dead_letter_id}/retry")
async def retry_event_bus_dead_letter_item(dead_letter_id: str):
    result = retry_event_bus_dead_letter(dead_letter_id)
    if not result.get("ok"):
        return {
            "status": "error",
            **result,
        }
    return {
        "status": "ok",
        **result,
    }


@admin_router.post("/event-bus/dead-letters/retry-failed")
async def retry_failed_event_bus_dead_letters_batch(
    limit: int = Query(20, ge=1, le=500),
    include_retry_failed: bool = Query(True),
):
    stats = retry_failed_event_bus_dead_letters(
        limit=limit,
        include_retry_failed=include_retry_failed,
    )
    return {
        "status": "ok",
        **stats,
    }


@admin_router.get("/event-bus/ops-events")
async def event_bus_ops_events(
    limit: int = Query(50, ge=1, le=500),
    dataset: str | None = Query(None, description="Optional dataset filter: stock|sec"),
    ticker: str | None = Query(None, description="Optional ticker filter."),
    status: str | None = Query(None, description="Optional status filter: success|failed"),
):
    items = list_ops_events(limit=limit, dataset=dataset, ticker=ticker, status=status)
    return {
        "status": "ok",
        "count": len(items),
        "items": items,
    }


@admin_router.post("/trigger/stock")
async def trigger_stock_update(background_tasks: BackgroundTasks):
    """
    Manually trigger stock data update for ALL tickers.
    Runs in background to avoid timeout.
    """
    background_tasks.add_task(trigger_stock_update_now)
    return {
        "status": "ok",
        "message": "Stock data update triggered. Running in background."
    }


@admin_router.post("/trigger/sec")
async def trigger_sec_update(background_tasks: BackgroundTasks):
    """
    Manually trigger SEC Form 4 data update for ALL tickers.
    Runs in background to avoid timeout.
    """
    background_tasks.add_task(trigger_sec_update_now)
    return {
        "status": "ok",
        "message": "SEC data update triggered. Running in background."
    }


@admin_router.post("/trigger/all")
async def trigger_all_updates(background_tasks: BackgroundTasks):
    """
    Manually trigger all data updates.
    Runs in background to avoid timeout.
    """
    background_tasks.add_task(trigger_stock_update_now)
    background_tasks.add_task(trigger_sec_update_now)
    background_tasks.add_task(trigger_alert_scan_now)
    return {
        "status": "ok",
        "message": "All data updates triggered (stock, SEC, alerts). Running in background."
    }


@admin_router.post("/trigger/alerts")
async def trigger_alert_scan(background_tasks: BackgroundTasks):
    """
    Manually trigger alert event scanning for users with active rules.
    Runs in background to avoid timeout.
    """
    background_tasks.add_task(trigger_alert_scan_now)
    return {
        "status": "ok",
        "message": "Alert event scan triggered. Running in background."
    }


@admin_router.post("/trigger/digest")
async def trigger_daily_digest(background_tasks: BackgroundTasks):
    """
    Manually trigger daily digest dispatch cycle.
    Runs in background to avoid timeout.
    """
    background_tasks.add_task(trigger_daily_digest_now)
    return {
        "status": "ok",
        "message": "Daily digest dispatch triggered. Running in background."
    }


@admin_router.post("/trigger/event-bus-dlq-retry")
async def trigger_event_bus_dlq_retry(background_tasks: BackgroundTasks):
    """
    Manually trigger event bus dead-letter retry cycle.
    Runs in background to avoid timeout.
    """
    background_tasks.add_task(trigger_event_bus_dlq_retry_now)
    return {
        "status": "ok",
        "message": "Event bus DLQ retry triggered. Running in background."
    }


@admin_router.get("/update/stock/{ticker}")
async def update_single_stock(
    ticker: str,
):
    """
    Update stock data for a SINGLE ticker.
    Memory-efficient endpoint for external cron services.
    
    Usage with cron-job.org (add X-API-Key request header):
    - URL: https://your-api.ondigitalocean.app/admin/update/stock/AAPL
    - Method: GET
    - Schedule: Every 15 minutes (stagger different tickers)
    """
    from scripts.stock_finance_data_extracton_script import save_stock_data
    
    ticker = validate_ticker(ticker)
    
    try:
        logger.info(f"[CRON] Updating stock data for {ticker}")
        save_stock_data(ticker)
        gc.collect()
        
        logger.info(f"[CRON] Stock data updated successfully for {ticker}")
        return {
            "status": "ok",
            "ticker": ticker,
            "message": f"Stock data updated for {ticker}"
        }
    except Exception as e:
        logger.error(f"[CRON] Failed to update stock data for {ticker}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update stock data for {ticker}: {str(e)}"
        )


@admin_router.get("/update/sec/{ticker}")
async def update_single_sec(
    ticker: str,
):
    """
    Update SEC Form 4 data for a SINGLE ticker.
    Memory-efficient endpoint for external cron services.
    
    Usage with cron-job.org (add X-API-Key request header):
    - URL: https://your-api.ondigitalocean.app/admin/update/sec/AAPL
    - Method: GET
    - Schedule: Daily (stagger different tickers by 5 minutes)
    """
    from scripts.sec_filing_data_extraction_script import insert_form4_data
    
    ticker = validate_ticker(ticker)
    cik = TICKER_CIK_MAPPING.get(ticker)
    
    if not cik:
        raise HTTPException(
            status_code=400,
            detail=f"No CIK mapping found for ticker {ticker}"
        )
    
    try:
        logger.info(f"[CRON] Updating SEC data for {ticker} (CIK: {cik})")
        insert_form4_data(ticker, cik)
        gc.collect()
        
        logger.info(f"[CRON] SEC data updated successfully for {ticker}")
        return {
            "status": "ok",
            "ticker": ticker,
            "cik": cik,
            "message": f"SEC Form 4 data updated for {ticker}"
        }
    except Exception as e:
        logger.error(f"[CRON] Failed to update SEC data for {ticker}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update SEC data for {ticker}: {str(e)}"
        )


@admin_router.get("/update/all-sequential")
async def update_all_sequential(
    type: str = Query("both", description="Update type: stock, sec, or both")
):
    """
    Update data for all tickers sequentially with memory cleanup between each.
    This is safer for memory-constrained environments.
    
    Note: This may take several minutes to complete.
    """
    from scripts.stock_finance_data_extracton_script import save_stock_data
    from scripts.sec_filing_data_extraction_script import insert_form4_data
    import time
    
    results = {
        "stock": {},
        "sec": {}
    }
    if type in ["stock", "both"]:
        for ticker in VALID_TICKERS:
            try:
                logger.info(f"[SEQUENTIAL] Updating stock for {ticker}")
                save_stock_data(ticker)
                results["stock"][ticker] = "success"
                gc.collect()
                time.sleep(1)
            except Exception as e:
                logger.error(f"[SEQUENTIAL] Stock update failed for {ticker}: {e}")
                results["stock"][ticker] = f"error: {str(e)}"
                gc.collect()
    if type in ["sec", "both"]:
        for ticker, cik in TICKER_CIK_MAPPING.items():
            try:
                logger.info(f"[SEQUENTIAL] Updating SEC for {ticker}")
                insert_form4_data(ticker, cik)
                results["sec"][ticker] = "success"
                gc.collect()
                time.sleep(2)
            except Exception as e:
                logger.error(f"[SEQUENTIAL] SEC update failed for {ticker}: {e}")
                results["sec"][ticker] = f"error: {str(e)}"
                gc.collect()
    
    return {
        "status": "ok",
        "message": "Sequential update completed",
        "results": results
    }


@admin_router.get("/health")
async def health_check():
    """
    Simple health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "tickers": VALID_TICKERS
    }
