"""
Admin router for scheduler management and per-ticker updates via external cron.
"""

import os
import gc
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends
from fastapi.security import APIKeyHeader
from scheduler import get_scheduled_jobs, trigger_stock_update_now, trigger_sec_update_now

logger = logging.getLogger(__name__)

admin_router = APIRouter()
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

VALID_TICKERS = ["AAPL", "NVDA", "META", "GOOGL", "MSFT", "AMZN", "TSLA", "NFLX"]

TICKER_CIK_MAPPING = {
    "AAPL": "0000320193",
    "NVDA": "0001045810",
    "META": "0001326801",
    "GOOGL": "0001652044",
    "MSFT": "0000789019",
    "AMZN": "0001018724",
    "TSLA": "0001318605",
    "NFLX": "0001065280"
}


async def verify_api_key(
    api_key_header: Optional[str] = Depends(API_KEY_HEADER),
    key: Optional[str] = Query(None, description="API key as query parameter")
):
    """
    Verify API key from header or query parameter.
    If ADMIN_API_KEY is not set, allow all requests (development).
    """
    if not ADMIN_API_KEY:
        return True
    
    provided_key = api_key_header or key
    if not provided_key or provided_key != ADMIN_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key"
        )
    return True


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
    return {
        "status": "ok",
        "message": "All data updates triggered. Running in background."
    }


@admin_router.get("/update/stock/{ticker}")
async def update_single_stock(
    ticker: str,
    _: bool = Depends(verify_api_key)
):
    """
    Update stock data for a SINGLE ticker.
    Memory-efficient endpoint for external cron services.
    
    Usage with cron-job.org:
    - URL: https://your-api.ondigitalocean.app/admin/update/stock/AAPL?key=YOUR_API_KEY
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
    _: bool = Depends(verify_api_key)
):
    """
    Update SEC Form 4 data for a SINGLE ticker.
    Memory-efficient endpoint for external cron services.
    
    Usage with cron-job.org:
    - URL: https://your-api.ondigitalocean.app/admin/update/sec/AAPL?key=YOUR_API_KEY
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
    _: bool = Depends(verify_api_key),
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
