"""
Scheduler module for automated data updates.
Runs daily jobs to fetch stock prices and SEC Form 4 filings.
"""

import logging
import time
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

# Configure logging for scheduler
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scheduler")

# Tickers to track
TICKERS = ["META", "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "NFLX"]

# Ticker to CIK mapping for SEC filings
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

# Use Eastern Time for market-aligned schedules
TIMEZONE = pytz.timezone('America/New_York')

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 60

# Create scheduler instance
scheduler = AsyncIOScheduler(timezone=TIMEZONE)


def retry_on_failure(func, *args, max_retries=MAX_RETRIES, delay=RETRY_DELAY_SECONDS):
    """
    Retry a function on failure with exponential backoff.
    """
    for attempt in range(max_retries):
        try:
            return func(*args)
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = delay * (2 ** attempt)  # Exponential backoff
                logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"All {max_retries} attempts failed for {func.__name__}: {e}")
                raise


def update_stock_data():
    """
    Fetch and update stock price data for all tracked tickers.
    Runs daily at 6:00 AM EST (after market close data is finalized).
    """
    from scripts.stock_finance_data_extracton_script import save_stock_data
    
    start_time = datetime.now()
    logger.info("=" * 50)
    logger.info(f"STOCK DATA UPDATE - Started at {start_time}")
    logger.info("=" * 50)
    
    successful = 0
    failed = 0
    
    for ticker in TICKERS:
        try:
            logger.info(f"Updating stock data for {ticker}...")
            retry_on_failure(save_stock_data, ticker)
            logger.info(f"[SUCCESS] Stock data updated for {ticker}")
            successful += 1
        except Exception as e:
            logger.error(f"[FAILED] Stock data update for {ticker}: {e}")
            failed += 1
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    logger.info("=" * 50)
    logger.info(f"STOCK DATA UPDATE - Completed")
    logger.info(f"  Duration: {duration:.2f} seconds")
    logger.info(f"  Successful: {successful}/{len(TICKERS)}")
    logger.info(f"  Failed: {failed}/{len(TICKERS)}")
    logger.info("=" * 50)


def update_sec_data():
    """
    Fetch and update SEC Form 4 insider trading data for all tracked tickers.
    Runs daily at 7:00 AM EST (SEC filings typically posted after hours).
    """
    from scripts.sec_filing_data_extraction_script import insert_form4_data
    
    start_time = datetime.now()
    logger.info("=" * 50)
    logger.info(f"SEC FORM 4 UPDATE - Started at {start_time}")
    logger.info("=" * 50)
    
    successful = 0
    failed = 0
    
    for ticker, cik in TICKER_CIK_MAPPING.items():
        try:
            logger.info(f"Updating SEC data for {ticker} (CIK: {cik})...")
            # Add delay between requests to respect SEC rate limits
            time.sleep(1)
            retry_on_failure(insert_form4_data, ticker, cik)
            logger.info(f"[SUCCESS] SEC data updated for {ticker}")
            successful += 1
        except Exception as e:
            logger.error(f"[FAILED] SEC data update for {ticker}: {e}")
            failed += 1
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    logger.info("=" * 50)
    logger.info(f"SEC FORM 4 UPDATE - Completed")
    logger.info(f"  Duration: {duration:.2f} seconds")
    logger.info(f"  Successful: {successful}/{len(TICKER_CIK_MAPPING)}")
    logger.info(f"  Failed: {failed}/{len(TICKER_CIK_MAPPING)}")
    logger.info("=" * 50)


def job_error_listener(event):
    """
    Listen for job execution errors and log them.
    """
    if event.exception:
        logger.error(f"Job {event.job_id} raised an exception: {event.exception}")
        logger.error(f"Traceback: {event.traceback}")


def setup_scheduled_jobs():
    """
    Configure and add all scheduled jobs to the scheduler.
    """
    # Stock data update - Daily at 6:00 AM EST
    scheduler.add_job(
        update_stock_data,
        CronTrigger(hour=6, minute=0, timezone=TIMEZONE),
        id='stock_data_update',
        name='Daily Stock Data Update',
        replace_existing=True,
        misfire_grace_time=3600  # Allow 1 hour grace period if missed
    )
    
    # SEC Form 4 data update - Daily at 7:00 AM EST
    scheduler.add_job(
        update_sec_data,
        CronTrigger(hour=7, minute=0, timezone=TIMEZONE),
        id='sec_data_update',
        name='Daily SEC Form 4 Update',
        replace_existing=True,
        misfire_grace_time=3600  # Allow 1 hour grace period if missed
    )
    
    logger.info("Scheduled jobs configured:")
    logger.info("  - Stock data update: Daily at 6:00 AM EST")
    logger.info("  - SEC Form 4 update: Daily at 7:00 AM EST")


def start_scheduler():
    """Start the scheduler and set up jobs."""
    from apscheduler.events import EVENT_JOB_ERROR
    
    # Add error listener
    scheduler.add_listener(job_error_listener, EVENT_JOB_ERROR)
    
    setup_scheduled_jobs()
    scheduler.start()
    logger.info("Scheduler started successfully")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    scheduler.shutdown(wait=False)
    logger.info("Scheduler shut down")


def get_scheduled_jobs():
    """
    Get list of all scheduled jobs and their next run times.
    Useful for monitoring/debugging.
    """
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": str(job.next_run_time) if job.next_run_time else None
        })
    return jobs


def trigger_stock_update_now():
    """Manually trigger stock data update (for testing/admin)."""
    logger.info("Manual trigger: Stock data update")
    update_stock_data()


def trigger_sec_update_now():
    """Manually trigger SEC data update (for testing/admin)."""
    logger.info("Manual trigger: SEC data update")
    update_sec_data()
