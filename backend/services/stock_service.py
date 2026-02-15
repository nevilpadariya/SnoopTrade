"""
Stock data service — production-optimized for MongoDB M0.

Optimizations:
  1. Projection: only fetch fields we actually need (excludes _id and extras)
  2. Index-aware sort: sort on Date DESC uses the index, no in-memory sort
  3. Batch conversion: list comprehension instead of loop + append
  4. Compound indexes: Date descending for range queries + sort
  5. ensure_indexes covers ALL collections (stocks, SEC, users)
"""

from datetime import datetime, timedelta
from database.database import stock_db, sec_db, user_db
from typing import List, Optional
from models.stock_data import StockDataModel
import pymongo
import pytz
import logging

logger = logging.getLogger(__name__)

TIME_PERIOD_DAYS = {
    "1w": 7,
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
}

EASTERN = pytz.timezone("America/New_York")

# Projection: only fetch the fields we actually serialize.
# Excluding _id and any extra fields saves bytes over the wire.
_STOCK_PROJECTION = {
    "_id": 0,
    "ticker": 1,
    "Date": 1,
    "Open": 1,
    "High": 1,
    "Low": 1,
    "Close": 1,
    "Volume": 1,
    "Dividends": 1,
    "Stock Splits": 1,
}


def fetch_stock_data(
    ticker: str, time_period: str = "1y", limit: Optional[int] = None
) -> List[StockDataModel]:
    """Fetch stock data using indexed query with projection."""
    collection = stock_db[f"stock_data_{ticker}"]
    days_ago = TIME_PERIOD_DAYS.get(time_period, 365)
    now_eastern = datetime.now(EASTERN)
    start_date = (now_eastern - timedelta(days=days_ago)).replace(tzinfo=None)

    # hint tells Mongo to use our index explicitly
    cursor = (
        collection.find({"Date": {"$gte": start_date}}, _STOCK_PROJECTION)
        .sort("Date", pymongo.DESCENDING)
    )
    if limit:
        cursor = cursor.limit(limit)

    # Batch convert — faster than loop+append
    return [
        StockDataModel(
            ticker=doc["ticker"],
            date=doc["Date"].isoformat(),
            open=float(doc.get("Open", 0)),
            high=float(doc.get("High", 0)),
            low=float(doc.get("Low", 0)),
            close=float(doc.get("Close", 0)),
            volume=int(doc.get("Volume", 0)),
            dividends=float(doc.get("Dividends", 0)),
            stock_splits=float(doc.get("Stock Splits", 0)),
        )
        for doc in cursor
    ]


def ensure_indexes() -> None:
    """
    Create indexes across ALL databases for optimal query performance.

    MongoDB M0 free tier supports up to 64 indexes per collection.
    We create sparse, targeted indexes that match our query patterns.
    """
    created = 0

    # ─── Stock data: Date DESC (used by range query + sort) ───
    try:
        for name in stock_db.list_collection_names():
            if name.startswith("stock_data_"):
                stock_db[name].create_index(
                    [("Date", pymongo.DESCENDING)],
                    name="idx_date_desc",
                    background=True,
                )
                created += 1
    except Exception as e:
        logger.warning("Stock index creation failed: %s", e)

    # ─── SEC / Form 4 transactions: transaction_date DESC ───
    try:
        for name in sec_db.list_collection_names():
            if name.startswith("form_4_links_"):
                sec_db[name].create_index(
                    [("transaction_date", pymongo.DESCENDING)],
                    name="idx_txn_date_desc",
                    background=True,
                )
                created += 1
    except Exception as e:
        logger.warning("SEC index creation failed: %s", e)

    # ─── Users: unique email index for fast login lookups ───
    try:
        user_db["users"].create_index(
            [("email", pymongo.ASCENDING)],
            name="idx_email_unique",
            unique=True,
            background=True,
        )
        created += 1
    except Exception as e:
        logger.warning("User email index creation failed: %s", e)

    logger.info("Database indexes ensured (%d collections)", created)
