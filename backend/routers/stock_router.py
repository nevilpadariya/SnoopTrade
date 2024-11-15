from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.security import OAuth2PasswordBearer
from typing import List
from backend.models.stock_data import StockDataModel
from backend.services.stock_service import fetch_stock_data
from backend.services.auth_services import decode_access_token

# Define the OAuth2 token dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
stock_router = APIRouter()

# Dependency for token verification
def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency that extracts and verifies the current user from the token.
    """
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
        period: str = Query("1y", regex="^(1w|1m|3m|6m|1y)$"),
        limit: int = Query(None, description="Limit the number of returned results"),
        user: dict = Depends(get_current_user)
):
    """
    Fetch stock data for a given ticker symbol over a specified period. Requires authentication.

    Args:
        ticker (str): The stock ticker symbol.
        period (str): The time period for the stock data (default is "1y").
        limit (int): The maximum number of records to retrieve.
        user (dict): The authenticated user, provided by Depends(get_current_user).

    Returns:
        List[StockDataModel]: A JSON response containing the stock data.
    """
    stock_data = fetch_stock_data(ticker, period, limit)

    if not stock_data:
        raise HTTPException(status_code=404, detail="No stock data found.")

    return stock_data
