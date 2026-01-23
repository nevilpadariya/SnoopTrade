"""
Admin router for scheduler management and monitoring.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from scheduler import get_scheduled_jobs, trigger_stock_update_now, trigger_sec_update_now

admin_router = APIRouter()


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
    Manually trigger stock data update.
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
    Manually trigger SEC Form 4 data update.
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
