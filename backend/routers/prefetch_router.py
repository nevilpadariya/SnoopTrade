from fastapi import APIRouter, Depends, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional, Any

# Services
from services.stock_service import fetch_stock_data, ensure_indexes
from services.stock_cache import get as get_stock_cache, put as put_stock_cache
from services.sec_service import get_all_transactions
from services.auth_services import decode_access_token
from routers.stock_router import _populate_stock_data_if_missing, VALID_TICKERS

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
prefetch_router = APIRouter()

class PrefetchResponse(BaseModel):
    stock_data: List[Any]
    transactions: List[Any]

def get_current_user(token: str = Depends(oauth2_scheme)):
    user = decode_access_token(token)
    if not user:
        # For prefetch, we might want to return 401, but the individual endpoints do it too.
        # Let's be consistent.
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user

@prefetch_router.get("/prefetch/{ticker}", response_model=PrefetchResponse)
async def prefetch_ticker_data(
    ticker: str,
    period: str = Query("1y", pattern="^(1w|1m|3m|6m|1y)$"),
    user: dict = Depends(get_current_user)
):
    """
    Fetch both stock data and SEC transactions in a single request.
    Reduces network round-trips for the mobile app's detail screen.
    """
    ticker_upper = ticker.upper()

    # 1. Fetch Stock Data (w/ Cache)
    stock_data = get_stock_cache(ticker_upper, period)
    if stock_data is None:
        # Cache miss
        stock_data = await run_in_threadpool(fetch_stock_data, ticker_upper, period, None)
        
        if not stock_data and ticker_upper in VALID_TICKERS:
            await run_in_threadpool(_populate_stock_data_if_missing, ticker_upper)
            stock_data = await run_in_threadpool(fetch_stock_data, ticker_upper, period, None)
        
        if stock_data:
            put_stock_cache(ticker_upper, period, stock_data)
        else:
            stock_data = []

    # 2. Fetch Transactions (w/ Cache inside the service? No, service has cache)
    # The sec_service.get_all_transactions already uses its own cache!
    # We just need to await it in threadpool.
    transactions = await run_in_threadpool(get_all_transactions, ticker_upper, period)
    if transactions is None:
        transactions = []

    return PrefetchResponse(
        stock_data=stock_data,
        transactions=transactions
    )
