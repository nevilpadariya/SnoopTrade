from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from typing import List
import pytz

from models.stock_data import StockDataModel
from services.stock_service import fetch_stock_data
from services.auth_services import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
stock_router = APIRouter()
EASTERN = pytz.timezone("America/New_York")


def get_current_user(token: str = Depends(oauth2_scheme)):
    """Extract and verify current user from the token."""
    user = decode_access_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def _refresh_stock_data_if_stale(ticker: str) -> None:
    """Fetch latest stock data from Yahoo and update DB. Used when served data is older than 1 day."""
    try:
        from scripts.stock_finance_data_extracton_script import save_stock_data
        save_stock_data(ticker)
    except Exception:
        pass


@stock_router.get("/stocks/{ticker}", response_model=List[StockDataModel])
def get_stock_data(
        ticker: str,
        period: str = Query("1y", pattern="^(1w|1m|3m|6m|1y)$"),
        limit: int = Query(None, description="Limit the number of returned results"),
        user: dict = Depends(get_current_user),
        background_tasks: BackgroundTasks,
):
    """Fetch stock data for a ticker over a period. Requires authentication. Triggers a background refresh if data is older than 1 day."""
    stock_data = fetch_stock_data(ticker, period, limit)

    if not stock_data:
        raise HTTPException(status_code=404, detail="No stock data found.")

    if len(stock_data) > 0:
        try:
            latest_date_str = stock_data[0].date[:10]
            latest_date = datetime.strptime(latest_date_str, "%Y-%m-%d").date()
            now_eastern = datetime.now(EASTERN).date()
            if (now_eastern - latest_date).days >= 1:
                background_tasks.add_task(_refresh_stock_data_if_stale, ticker.upper())
        except Exception:
            pass

    return stock_data
