"""
SEC Form 4 transaction service — optimized with projection, sorting, and caching.

Optimizations:
  1. Projection: exclude _id and any extra fields
  2. Sort by transaction_date DESC so newest transactions come first (uses index)
  3. In-memory cache (5 min TTL) for transaction lists
  4. .get() with defaults to avoid KeyError on sparse documents
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Union, List, Optional, Dict, Tuple

from bson import ObjectId
from pymongo.errors import PyMongoError
from database.database import sec_db as db
from models.sec_form4 import TransactionModel

logger = logging.getLogger(__name__)

# ─── In-memory cache (same pattern as stock_cache) ───
_TTL_SECONDS = 300
_cache: Dict[Tuple[str, str], Tuple[float, List[TransactionModel]]] = {}

_TIME_PERIOD_MAP = {
    "1w": 7,
    "1m": 35,
    "3m": 84,
    "6m": 168,
    "1y": 365,
}

# Only fetch fields that TransactionModel uses
_TXN_PROJECTION = {
    "_id": 0,
    "filing_date": 1,
    "issuer_name": 1,
    "issuer_cik": 1,
    "trading_symbol": 1,
    "reporting_owner_name": 1,
    "reporting_owner_cik": 1,
    "transaction_date": 1,
    "security_title": 1,
    "transaction_code": 1,
    "shares": 1,
    "shares_owned_following_transaction": 1,
    "price_per_share": 1,
    "ownership_type": 1,
    "is_director": 1,
    "is_officer": 1,
    "is_ten_percent_owner": 1,
    "officer_title": 1,
}


def get_transaction_by_id(ticker: str, transaction_id: str) -> Optional[TransactionModel]:
    """Retrieve a specific transaction by ticker and ID."""
    try:
        transaction_id_obj = ObjectId(transaction_id)
    except Exception:
        logger.error("Invalid transaction ID: %s", transaction_id)
        return None
    try:
        collection = db[f"form_4_links_{ticker}"]
        document = collection.find_one({"_id": transaction_id_obj})
        if document:
            return TransactionModel(**document)
        logger.warning("Transaction not found: %s in %s", transaction_id, ticker)
    except PyMongoError as e:
        logger.error("DB error fetching txn %s/%s: %s", ticker, transaction_id, e)
    except Exception as e:
        logger.error("Unexpected error fetching txn %s/%s: %s", ticker, transaction_id, e)
    return None


def get_all_transactions(ticker: str, time_period: Optional[str] = None) -> Union[List[TransactionModel], None]:
    """
    Retrieve transactions for a ticker, with optional time filter.
    Uses in-memory cache (5 min TTL) and index-aware descending sort.
    """
    cache_key = (ticker, time_period or "all")

    # Check cache first
    entry = _cache.get(cache_key)
    if entry is not None:
        ts, data = entry
        if time.time() - ts <= _TTL_SECONDS:
            return data
        _cache.pop(cache_key, None)

    try:
        collection = db[f"form_4_links_{ticker}"]

        date_filter: dict = {}
        if time_period and time_period in _TIME_PERIOD_MAP:
            days = _TIME_PERIOD_MAP[time_period]
            start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
            date_filter = {"transaction_date": {"$gte": start}}

        # Sort by transaction_date DESC (uses idx_txn_date_desc index)
        cursor = (
            collection.find(date_filter, _TXN_PROJECTION)
            .sort("transaction_date", -1)
        )

        transactions = [TransactionModel(**doc) for doc in cursor]

        if transactions:
            _cache[cache_key] = (time.time(), transactions)
            return transactions
        else:
            logger.warning("No transactions for %s in period %s", ticker, time_period)
            return None

    except PyMongoError as e:
        logger.error("DB error retrieving transactions for %s: %s", ticker, e)
    except Exception as e:
        logger.error("Unexpected error retrieving transactions for %s: %s", ticker, e)
    return None
