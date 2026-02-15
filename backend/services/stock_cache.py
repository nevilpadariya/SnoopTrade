"""
In-memory TTL stock-data cache.

Stores stock results in a dict keyed by (ticker, period).
Entries expire after TTL_SECONDS (default 5 min).
This avoids repeated MongoDB Atlas round-trips for the same data
within a short window — the biggest latency win for the mobile app.
"""

import time
from typing import Dict, List, Optional, Tuple

from models.stock_data import StockDataModel

TTL_SECONDS = 300  # 5 minutes

_cache: Dict[Tuple[str, str], Tuple[float, List[StockDataModel]]] = {}


def get(ticker: str, period: str) -> Optional[List[StockDataModel]]:
    """Return cached data if still valid, else None."""
    key = (ticker, period)
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, data = entry
    if time.time() - ts > TTL_SECONDS:
        _cache.pop(key, None)
        return None
    return data


def put(ticker: str, period: str, data: List[StockDataModel]) -> None:
    """Store data in cache with current timestamp."""
    _cache[(ticker, period)] = (time.time(), data)


def invalidate(ticker: str) -> None:
    """Remove all cached entries for a ticker (called after refresh)."""
    keys_to_remove = [k for k in _cache if k[0] == ticker]
    for k in keys_to_remove:
        _cache.pop(k, None)
