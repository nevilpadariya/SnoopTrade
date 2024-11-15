# services/sec_service.py

import logging
from datetime import datetime, timedelta
from typing import Union, List, Optional

from bson import ObjectId
from pymongo.errors import PyMongoError
from backend.database.database import sec_db as db
from backend.models.sec_form4 import TransactionModel

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("transaction_service.log"), logging.StreamHandler()]
)


# Function to retrieve a specific transaction by ID
def get_transaction_by_id(ticker: str, transaction_id: str) -> Optional[TransactionModel]:
    """
    Retrieves a specific transaction by ticker and transaction ID.

    Args:
        ticker (str): The ticker symbol of the collection name (e.g., "AAPL").
        transaction_id (str): The ObjectId of the transaction document as a string.

    Returns:
        Optional[TransactionModel]: Returns a TransactionModel if the transaction is found, or None if not.
    """
    try:
        transaction_id_obj = ObjectId(transaction_id)
    except Exception as e:
        logging.error(f"Invalid transaction ID: {transaction_id}")
        return None
    try:
        collection = db[f"form_4_links_{ticker}"]
        document = collection.find_one({"_id": transaction_id_obj})
        if document:
            return TransactionModel(**document)
        else:
            logging.warning(f"Transaction not found for ID: {transaction_id} in collection {ticker}")
    except PyMongoError as e:
        logging.error(f"Database error while fetching transaction by ID {transaction_id} for ticker {ticker}: {e}")
    except Exception as e:
        logging.error(f"Unexpected error while fetching transaction by ID {transaction_id}: {e}")
    return None


# Function to retrieve all transactions with optional time period filter
def get_all_transactions(ticker: str, time_period: Optional[str] = None) -> Union[List[TransactionModel], None]:
    """
    Retrieves all transactions for a given ticker, optionally filtering by a specified time period.

    Args:
        ticker (str): The ticker symbol of the collection name (e.g., "AAPL").
        time_period (Optional[str]): The time period for filtering transactions ("1w", "1m", "3m", "6m").

    Returns:
        Union[List[TransactionModel], None]: A list of TransactionModel instances if transactions are found,
                                             or None if no transactions are found.
    """
    try:
        collection = db[f"form_4_links_{ticker}"]

        # Calculate the date range based on time_period
        date_filter = {}
        if time_period:
            end_date = datetime.now()
            if time_period == "1w":
                start_date = end_date - timedelta(weeks=1)
            elif time_period == "1m":
                start_date = end_date - timedelta(weeks=4)
            elif time_period == "3m":
                start_date = end_date - timedelta(weeks=12)
            elif time_period == "6m":
                start_date = end_date - timedelta(weeks=24)
            else:
                logging.warning(f"Invalid time period '{time_period}' specified.")
                return None

            date_filter = {"transaction_date": {"$gte": start_date.strftime("%Y-%m-%d")}}

        # Fetch transactions with the date filter applied
        cursor = collection.find(date_filter)

        transactions = [TransactionModel(**doc) for doc in cursor]

        if transactions:
            logging.info(f"Retrieved {len(transactions)} transactions for ticker '{ticker}' in period '{time_period}'")
            return transactions
        else:
            logging.warning(f"No transactions found for ticker '{ticker}' in period '{time_period}'")
            return None

    except PyMongoError as e:
        logging.error(f"Database error while retrieving transactions for ticker {ticker}: {e}")
    except Exception as e:
        logging.error(f"Unexpected error while retrieving transactions for ticker {ticker}: {e}")
    return None