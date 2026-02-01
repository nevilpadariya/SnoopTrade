from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.security import OAuth2PasswordBearer
from typing import List
from models.stock_data import StockDataModel
from services.stock_service import fetch_stock_data
from services.auth_services import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
stock_router = APIRouter()


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


@stock_router.get("/stocks/{ticker}", response_model=List[StockDataModel])
def get_stock_data(
        ticker: str,
        period: str = Query("1y", pattern="^(1w|1m|3m|6m|1y)$"),
        limit: int = Query(None, description="Limit the number of returned results"),
        user: dict = Depends(get_current_user)
):
    """Fetch stock data for a ticker over a period. Requires authentication."""
    stock_data = fetch_stock_data(ticker, period, limit)

    if not stock_data:
        raise HTTPException(status_code=404, detail="No stock data found.")

    return stock_data
