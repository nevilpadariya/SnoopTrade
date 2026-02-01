# sec_router.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional

from models.sec_form4 import TransactionModel
from services.sec_service import get_transaction_by_id, get_all_transactions
from services.auth_services import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
sec_router = APIRouter()


# Dependency function to verify token
def get_current_user(token: str = Depends(oauth2_scheme)):
    user = decode_access_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token")
    return user


@sec_router.get("/transactions/{ticker}/{transaction_id}", response_model=TransactionModel)
async def read_transaction(ticker: str, transaction_id: str, user: dict = Depends(get_current_user)):
    """
    Retrieves a specific transaction by ticker and transaction ID. Requires authentication.
    """
    transaction = get_transaction_by_id(ticker, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@sec_router.get("/transactions/{ticker}", response_model=List[TransactionModel])
async def read_all_transactions(
    ticker: str,
    time_period: Optional[str] = Query(None, pattern="^(1w|1m|3m|6m|1y)$"),
    user: dict = Depends(get_current_user)
):
    """
    Retrieves all transactions for a given ticker and optional time period. Requires authentication.

    - **ticker**: The ticker symbol of the collection.
    - **time_period**: Optional time period filter. Accepts "1w" (1 week), "1m" (1 month), "3m" (3 months), "6m" (6 months).
    """
    transactions = get_all_transactions(ticker, time_period)

    if transactions is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"No transactions found for ticker '{ticker}' in period '{time_period}'")
    return transactions
