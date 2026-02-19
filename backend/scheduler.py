"""Scheduler for daily stock and SEC Form 4 data updates."""

import logging
import os
import time
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

from services.event_bus import (
    TOPIC_DATA_REFRESH_COMPLETED,
    publish_event,
    retry_failed_event_bus_dead_letters,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scheduler")

TICKERS = [
    "META", "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "NFLX",
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

TIMEZONE = pytz.timezone('America/New_York')
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 60
scheduler = AsyncIOScheduler(timezone=TIMEZONE)
ENABLE_ALERT_SCANNER = os.getenv("ENABLE_ALERT_SCANNER", "true").strip().lower() == "true"
ALERT_SCAN_CRON_MINUTE = os.getenv("ALERT_SCAN_CRON_MINUTE", "*/30").strip() or "*/30"
ENABLE_DAILY_DIGEST = os.getenv("ENABLE_DAILY_DIGEST", "true").strip().lower() == "true"
DAILY_DIGEST_CRON_MINUTE = os.getenv("DAILY_DIGEST_CRON_MINUTE", "15").strip() or "15"
ENABLE_DATA_REFRESH_EVENTS = os.getenv("ENABLE_DATA_REFRESH_EVENTS", "true").strip().lower() == "true"
ENABLE_EVENT_BUS_DLQ_RETRY = os.getenv("ENABLE_EVENT_BUS_DLQ_RETRY", "true").strip().lower() == "true"
EVENT_BUS_DLQ_RETRY_CRON_MINUTE = os.getenv("EVENT_BUS_DLQ_RETRY_CRON_MINUTE", "*/10").strip() or "*/10"

try:
    EVENT_BUS_DLQ_RETRY_BATCH = max(1, min(500, int(os.getenv("EVENT_BUS_DLQ_RETRY_BATCH", "20").strip() or "20")))
except ValueError:
    EVENT_BUS_DLQ_RETRY_BATCH = 20

try:
    _ALERT_SCAN_MAX_USERS_RAW = os.getenv("ALERT_SCAN_MAX_USERS", "0").strip()
    _parsed_max_users = int(_ALERT_SCAN_MAX_USERS_RAW)
    ALERT_SCAN_MAX_USERS: int | None = _parsed_max_users if _parsed_max_users > 0 else None
except ValueError:
    logger.warning("Invalid ALERT_SCAN_MAX_USERS value. Falling back to all users.")
    ALERT_SCAN_MAX_USERS = None


def retry_on_failure(func, *args, max_retries=MAX_RETRIES, delay=RETRY_DELAY_SECONDS):
    """
    Retry a function on failure with exponential backoff.
    """
    for attempt in range(max_retries):
        try:
            return func(*args)
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = delay * (2 ** attempt)
                logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"All {max_retries} attempts failed for {func.__name__}: {e}")
                raise


def _emit_data_refresh_event(
    *,
    dataset: str,
    ticker: str,
    status: str,
    started_at: datetime,
    finished_at: datetime,
    cik: str | None = None,
    error: str | None = None,
) -> None:
    if not ENABLE_DATA_REFRESH_EVENTS:
        return

    try:
        duration_ms = max(0, int((finished_at - started_at).total_seconds() * 1000))
        payload = {
            "dataset": dataset,
            "ticker": ticker,
            "status": status,
            "cik": cik,
            "error": error,
            "duration_ms": duration_ms,
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "source": "scheduler",
        }
        publish_event(TOPIC_DATA_REFRESH_COMPLETED, payload, key=ticker)
    except Exception:
        logger.warning("Failed to emit data refresh event dataset=%s ticker=%s", dataset, ticker, exc_info=True)


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
        ticker_started_at = datetime.now(timezone.utc)
        try:
            logger.info(f"Updating stock data for {ticker}...")
            retry_on_failure(save_stock_data, ticker)
            logger.info(f"[SUCCESS] Stock data updated for {ticker}")
            successful += 1
            _emit_data_refresh_event(
                dataset="stock",
                ticker=ticker,
                status="success",
                started_at=ticker_started_at,
                finished_at=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.error(f"[FAILED] Stock data update for {ticker}: {e}")
            failed += 1
            _emit_data_refresh_event(
                dataset="stock",
                ticker=ticker,
                status="failed",
                started_at=ticker_started_at,
                finished_at=datetime.now(timezone.utc),
                error=str(e),
            )
    
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
        ticker_started_at = datetime.now(timezone.utc)
        try:
            logger.info(f"Updating SEC data for {ticker} (CIK: {cik})...")
            time.sleep(1)
            retry_on_failure(insert_form4_data, ticker, cik)
            logger.info(f"[SUCCESS] SEC data updated for {ticker}")
            successful += 1
            _emit_data_refresh_event(
                dataset="sec",
                ticker=ticker,
                status="success",
                started_at=ticker_started_at,
                finished_at=datetime.now(timezone.utc),
                cik=cik,
            )
        except Exception as e:
            logger.error(f"[FAILED] SEC data update for {ticker}: {e}")
            failed += 1
            _emit_data_refresh_event(
                dataset="sec",
                ticker=ticker,
                status="failed",
                started_at=ticker_started_at,
                finished_at=datetime.now(timezone.utc),
                cik=cik,
                error=str(e),
            )
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    logger.info("=" * 50)
    logger.info(f"SEC FORM 4 UPDATE - Completed")
    logger.info(f"  Duration: {duration:.2f} seconds")
    logger.info(f"  Successful: {successful}/{len(TICKER_CIK_MAPPING)}")
    logger.info(f"  Failed: {failed}/{len(TICKER_CIK_MAPPING)}")
    logger.info("=" * 50)


def scan_alert_events():
    """
    Evaluate alert rules for all users on a recurring cadence.
    Generates unread notification events without requiring manual scans.
    """
    from routers.alerts_router import run_alert_scan_for_all_users

    start_time = datetime.now()
    logger.info("=" * 50)
    logger.info(f"ALERT EVENT SCAN - Started at {start_time}")
    logger.info("=" * 50)

    try:
        stats = run_alert_scan_for_all_users(limit_users=ALERT_SCAN_MAX_USERS)
        scanned_users = int(stats.get("scanned_users", 0))
        failed_users = int(stats.get("failed_users", 0))
        generated_events = int(stats.get("generated_events", 0))
        total_rules = int(stats.get("total_rules", 0))
    except Exception as exc:
        logger.error("ALERT EVENT SCAN failed: %s", exc, exc_info=True)
        raise

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    logger.info("=" * 50)
    logger.info("ALERT EVENT SCAN - Completed")
    logger.info(f"  Duration: {duration:.2f} seconds")
    logger.info(f"  Users scanned: {scanned_users}")
    logger.info(f"  Failed users: {failed_users}")
    logger.info(f"  Rules evaluated: {total_rules}")
    logger.info(f"  New events generated: {generated_events}")
    logger.info("=" * 50)


def run_daily_digest_dispatch():
    """
    Evaluate which users are due for daily digest notifications and dispatch them.
    """
    from services.notifications_service import send_due_daily_digests_for_all_users

    start_time = datetime.now()
    logger.info("=" * 50)
    logger.info("DAILY DIGEST DISPATCH - Started at %s", start_time)
    logger.info("=" * 50)

    try:
        stats = send_due_daily_digests_for_all_users()
        processed = int(stats.get("processed", 0))
        sent = int(stats.get("sent", 0))
        skipped = int(stats.get("skipped", 0))
        failed = int(stats.get("failed", 0))
    except Exception as exc:
        logger.error("DAILY DIGEST DISPATCH failed: %s", exc, exc_info=True)
        raise

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    logger.info("=" * 50)
    logger.info("DAILY DIGEST DISPATCH - Completed")
    logger.info("  Duration: %.2f seconds", duration)
    logger.info("  Users processed: %s", processed)
    logger.info("  Digests sent: %s", sent)
    logger.info("  Users skipped: %s", skipped)
    logger.info("  Failed users: %s", failed)
    logger.info("=" * 50)


def run_event_bus_dlq_retry():
    """
    Retry failed/retry_failed dead-letter events in bounded batches.
    """
    start_time = datetime.now()
    logger.info("=" * 50)
    logger.info("EVENT BUS DLQ RETRY - Started at %s", start_time)
    logger.info("=" * 50)

    try:
        stats = retry_failed_event_bus_dead_letters(limit=EVENT_BUS_DLQ_RETRY_BATCH, include_retry_failed=True)
        attempted = int(stats.get("attempted", 0))
        republished = int(stats.get("republished", 0))
        retry_failed = int(stats.get("retry_failed", 0))
    except Exception as exc:
        logger.error("EVENT BUS DLQ RETRY failed: %s", exc, exc_info=True)
        raise

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    logger.info("=" * 50)
    logger.info("EVENT BUS DLQ RETRY - Completed")
    logger.info("  Duration: %.2f seconds", duration)
    logger.info("  Attempted: %s", attempted)
    logger.info("  Republished: %s", republished)
    logger.info("  Retry failed: %s", retry_failed)
    logger.info("=" * 50)


def job_error_listener(event):
    """
    Listen for job execution errors and log them.
    """
    if event.exception:
        logger.error(f"Job {event.job_id} raised an exception: {event.exception}")
        logger.error(f"Traceback: {event.traceback}")


def setup_scheduled_jobs():
    """Configure and add all scheduled jobs to the scheduler."""
    scheduler.add_job(
        update_stock_data,
        CronTrigger(hour=6, minute=0, timezone=TIMEZONE),
        id='stock_data_update',
        name='Daily Stock Data Update',
        replace_existing=True,
        misfire_grace_time=3600
    )
    scheduler.add_job(
        update_sec_data,
        CronTrigger(hour=7, minute=0, timezone=TIMEZONE),
        id='sec_data_update',
        name='Daily SEC Form 4 Update',
        replace_existing=True,
        misfire_grace_time=3600
    )
    if ENABLE_ALERT_SCANNER:
        scheduler.add_job(
            scan_alert_events,
            CronTrigger(minute=ALERT_SCAN_CRON_MINUTE, timezone=TIMEZONE),
            id="alert_event_scan",
            name="Recurring Alert Event Scan",
            replace_existing=True,
            misfire_grace_time=900,
        )
    if ENABLE_DAILY_DIGEST:
        scheduler.add_job(
            run_daily_digest_dispatch,
            CronTrigger(minute=DAILY_DIGEST_CRON_MINUTE, timezone=TIMEZONE),
            id="daily_digest_dispatch",
            name="Daily Digest Dispatch",
            replace_existing=True,
            misfire_grace_time=900,
        )
    if ENABLE_EVENT_BUS_DLQ_RETRY:
        scheduler.add_job(
            run_event_bus_dlq_retry,
            CronTrigger(minute=EVENT_BUS_DLQ_RETRY_CRON_MINUTE, timezone=TIMEZONE),
            id="event_bus_dlq_retry",
            name="Event Bus Dead-Letter Retry",
            replace_existing=True,
            misfire_grace_time=900,
        )

    logger.info("Scheduled jobs configured:")
    logger.info("  - Stock data update: Daily at 6:00 AM EST")
    logger.info("  - SEC Form 4 update: Daily at 7:00 AM EST")
    if ENABLE_ALERT_SCANNER:
        logger.info("  - Alert event scan: Cron minute=%s EST", ALERT_SCAN_CRON_MINUTE)
    else:
        logger.info("  - Alert event scan: Disabled (set ENABLE_ALERT_SCANNER=true to enable)")
    if ENABLE_DAILY_DIGEST:
        logger.info("  - Daily digest dispatch: Hourly at minute=%s EST", DAILY_DIGEST_CRON_MINUTE)
    else:
        logger.info("  - Daily digest dispatch: Disabled (set ENABLE_DAILY_DIGEST=true to enable)")
    if ENABLE_EVENT_BUS_DLQ_RETRY:
        logger.info(
            "  - Event bus DLQ retry: Cron minute=%s EST (batch=%s)",
            EVENT_BUS_DLQ_RETRY_CRON_MINUTE,
            EVENT_BUS_DLQ_RETRY_BATCH,
        )
    else:
        logger.info("  - Event bus DLQ retry: Disabled (set ENABLE_EVENT_BUS_DLQ_RETRY=true to enable)")


def start_scheduler():
    """Start the scheduler and set up jobs."""
    from apscheduler.events import EVENT_JOB_ERROR
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


def trigger_alert_scan_now():
    """Manually trigger alert event scan (for testing/admin)."""
    logger.info("Manual trigger: Alert event scan")
    scan_alert_events()


def trigger_daily_digest_now():
    """Manually trigger daily digest dispatch cycle (for testing/admin)."""
    logger.info("Manual trigger: Daily digest dispatch")
    run_daily_digest_dispatch()


def trigger_event_bus_dlq_retry_now():
    """Manually trigger event bus dead-letter retry cycle (for testing/admin)."""
    logger.info("Manual trigger: Event bus DLQ retry")
    run_event_bus_dlq_retry()
