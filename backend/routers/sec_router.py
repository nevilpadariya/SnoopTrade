from fastapi import APIRouter, HTTPException, Depends, status, Query, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional

from models.sec_form4 import TransactionModel
from services.sec_service import get_transaction_by_id, get_all_transactions
from services.auth_services import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
sec_router = APIRouter()


def get_current_user(token: str = Depends(oauth2_scheme)):
    user = decode_access_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token")
    return user


@sec_router.get("/transactions/{ticker}/{transaction_id}", response_model=TransactionModel)
async def read_transaction(ticker: str, transaction_id: str, user: dict = Depends(get_current_user)):
    """Get a specific transaction by ticker and ID. Requires authentication."""
    transaction = get_transaction_by_id(ticker, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@sec_router.get("/transactions/{ticker}", response_model=List[TransactionModel])
async def read_all_transactions(
    ticker: str,
    response: Response,
    time_period: Optional[str] = Query(None, pattern="^(1w|1m|3m|6m|1y)$"),
    user: dict = Depends(get_current_user)
):
    """Get all transactions for a ticker with optional time period. Requires authentication."""
    # Run synchronous DB call in threadpool to avoid blocking event loop
    transactions = await run_in_threadpool(get_all_transactions, ticker, time_period)

    if transactions is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"No transactions found for ticker '{ticker}' in period '{time_period}'")
    
    # Allow client-side caching for 60 seconds
    response.headers["Cache-Control"] = "public, max-age=60"
    return transactions
