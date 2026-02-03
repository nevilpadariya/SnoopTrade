"""
Stock data extraction script with memory optimization.
Fetches stock price data from Yahoo Finance and stores in MongoDB.
"""

import gc
import yfinance as yf
from pymongo import UpdateOne, errors
from dateutil import parser
from datetime import datetime, timedelta
from pymongo import MongoClient
from pathlib import Path
from dotenv import load_dotenv
import logging
import os
import pytz

EASTERN = pytz.timezone("America/New_York")

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://your-default-uri")
_client = None
_db = None


def validate_mongodb_uri(uri: str) -> tuple[bool, str]:
    """
    Validate MongoDB URI format and provide helpful error messages.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not uri or uri == "mongodb+srv://your-default-uri":
        return False, "MONGODB_URI environment variable is not set or using default value"
    
    if not uri.startswith(("mongodb://", "mongodb+srv://")):
        return False, f"Invalid MongoDB URI format. Must start with 'mongodb://' or 'mongodb+srv://'. Got: {uri[:30]}..."
    
    # Check for common typos
    if "mongodb+srv://" in uri:
        # Extract hostname
        try:
            # Format: mongodb+srv://user:pass@hostname/database?options
            parts = uri.split("@")
            if len(parts) < 2:
                return False, "MongoDB URI missing '@' delimiter (check username:password@hostname format)"
            
            hostname_part = parts[1].split("/")[0].split("?")[0]
            
            # Check for suspicious patterns
            if "srvio.net" in hostname_part and "mongodb.net" not in hostname_part:
                return False, f"Hostname looks suspicious: '{hostname_part}'. MongoDB Atlas URLs typically end with '.mongodb.net'"
            
        except Exception as e:
            return False, f"Error parsing MongoDB URI: {e}"
    
    return True, ""


def get_db():
    """
    Get MongoDB database connection with lazy initialization.
    This helps reduce memory usage when the script is imported but not used.
    """
    global _client, _db
    if _client is None:
        # Validate URI before attempting connection
        is_valid, error_msg = validate_mongodb_uri(MONGODB_URI)
        if not is_valid:
            logger.error(f"MongoDB URI validation failed: {error_msg}")
            raise ValueError(f"Invalid MongoDB URI: {error_msg}")
        
        try:
            logger.info("Connecting to MongoDB...")
            _client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=10000,  # 10 second timeout
                connectTimeoutMS=10000
            )
            # Test the connection
            _client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
            _db = _client["stock_data"]
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            logger.error(f"MongoDB URI (first 30 chars): {MONGODB_URI[:30] if MONGODB_URI else 'None'}...")
            raise
    return _db


def close_db_connection():
    """
    Close MongoDB connection to free resources.
    """
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None


logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler()
        ]
    )


def fetch_stock_data(ticker: str, period: str = "3mo", end_date=None) -> tuple:
    """
    Fetches stock data for the specified ticker and period.

    Args:
        ticker (str): Stock ticker symbol.
        period (str): Period for which to fetch data.
                     Options: '1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'
                     Default is '3mo' for frequent updates (memory-efficient).
                     Use '1y' for initial data population.
        end_date: Optional date (Eastern) through which to fetch (inclusive).
                  Use to ensure data through "today" (pass tomorrow's date; yfinance end is exclusive).

    Returns:
        tuple: A list of stock data and an error message (if any).
    """
    logger.info(f"Fetching stock data for ticker: {ticker} (period: {period}, end_date: {end_date})")
    
    try:
        stock = yf.Ticker(ticker)
        if end_date is not None:
            # Explicit end date so we get data through the last trading day (e.g. through today).
            # end_date is exclusive in yfinance, so pass day after desired last date.
            start = (end_date - timedelta(days=365)).strftime("%Y-%m-%d")
            end = (end_date + timedelta(days=1)).strftime("%Y-%m-%d")
            hist = stock.history(start=start, end=end)
        else:
            hist = stock.history(period=period)

        if hist.empty:
            logger.warning(f"No data found for ticker: {ticker}")
            return None, "No data found for this ticker."

        data = hist.reset_index().to_dict(orient='records')
        logger.info(f"Fetched {len(data)} records for ticker: {ticker}")
        
        del stock
        del hist
        gc.collect()
        
        return data, None
    except Exception as e:
        logger.error(f"Error fetching data for {ticker}: {e}")
        return None, str(e)

def ensure_index(collection):
    """
    Ensures an index on the 'Date' field to optimize upsert performance.
    """
    try:
        collection.create_index([("Date", 1)], unique=True)
        logger.debug("Ensured index on Date field.")
    except errors.OperationFailure as e:
        logger.error(f"Error ensuring index on Date field: {e}")


def insert_stock_data(ticker: str, stock_data: list, max_entries: int = 500):
    """
    Inserts new stock data into the database while keeping only the latest max_entries.
    Uses batch processing for memory efficiency.

    Args:
        ticker (str): Stock ticker symbol.
        stock_data (list): Stock data to insert.
        max_entries (int): Maximum number of entries to retain.
    """
    db = get_db()
    collection = db[f"stock_data_{ticker}"]

    # Ensure index on 'Date' field
    ensure_index(collection)

    # Filter out data older than one year
    one_year_ago = datetime.now() - timedelta(days=365)
    collection.delete_many({"Date": {"$lt": one_year_ago}})

    # Process in batches for memory efficiency
    BATCH_SIZE = 50
    total_processed = 0
    
    for i in range(0, len(stock_data), BATCH_SIZE):
        batch = stock_data[i:i + BATCH_SIZE]
        operations = [
            UpdateOne(
                {"Date": parser.parse(str(data['Date']))},
                {"$set": {**data, "ticker": ticker}},
                upsert=True
            )
            for data in batch
        ]

        if operations:
            try:
                collection.bulk_write(operations, ordered=False)
                total_processed += len(batch)
            except errors.BulkWriteError as bwe:
                logger.error(f"Bulk write error for {ticker}: {bwe.details}")
        
        del batch
        del operations
        gc.collect()
    
    logger.info(f"Bulk insert completed for {ticker}. Processed {total_processed} records.")

    # Retain only the latest max_entries (more memory-efficient approach)
    try:
        # Get count first to avoid loading unnecessary data
        total_count = collection.count_documents({})
        if total_count > max_entries:
            # Find the cutoff date
            skip_count = max_entries
            cutoff_doc = collection.find().sort("Date", -1).skip(skip_count).limit(1)
            cutoff_list = list(cutoff_doc)
            if cutoff_list:
                oldest_date_to_keep = cutoff_list[0]["Date"]
                result = collection.delete_many({"Date": {"$lt": oldest_date_to_keep}})
                logger.info(f"Trimmed {result.deleted_count} old entries for {ticker}, keeping latest {max_entries} records.")
            del cutoff_list
    except Exception as e:
        logger.error(f"Error trimming old entries for {ticker}: {e}")

def save_stock_data(ticker: str, max_entries: int = 500, period: str = "3mo", through_today: bool = True):
    """
    Fetches and saves stock data for a given ticker.
    Memory-optimized with garbage collection after each operation.

    Args:
        ticker (str): Stock ticker symbol.
        max_entries (int): Maximum number of entries to retain in the database.
        period (str): Data period to fetch when through_today is False. Use '3mo' for frequent updates, '1y' for initial load.
        through_today (bool): If True, request data through today (Eastern) so the latest trading day is included.
    """
    try:
        end_date = datetime.now(EASTERN).date() if through_today else None
        stock_data, error = fetch_stock_data(ticker, period=period, end_date=end_date)

        if error:
            logger.error(f"Error for {ticker}: {error}")
            return False

        if not stock_data:
            logger.warning(f"No stock data available for {ticker}.")
            return False

        insert_stock_data(ticker, stock_data, max_entries)
        logger.info(f"Data for {ticker} saved to the database.")
        
        # Clean up
        del stock_data
        gc.collect()
        
        return True
    except Exception as e:
        logger.error(f"Unexpected error saving data for {ticker}: {e}")
        gc.collect()
        return False


def save_all_stock_data(tickers: list = None, max_entries: int = 500, period: str = "3mo"):
    """
    Fetch and save stock data for multiple tickers with memory cleanup between each.
    
    Args:
        tickers: List of ticker symbols. Defaults to standard list if None.
        max_entries: Maximum entries to retain per ticker.
        period: Data period to fetch.
    """
    if tickers is None:
        tickers = ["META", "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "NFLX"]
    
    results = {"success": [], "failed": []}
    
    for ticker in tickers:
        logger.info(f"Processing {ticker}...")
        success = save_stock_data(ticker, max_entries=max_entries, period=period)
        
        if success:
            results["success"].append(ticker)
        else:
            results["failed"].append(ticker)
        
        # Force garbage collection between tickers
        gc.collect()
    
    # Close DB connection when done processing all
    close_db_connection()
    gc.collect()
    
    logger.info(f"Completed: {len(results['success'])} success, {len(results['failed'])} failed")
    return results


# Main entry point
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fetch and store stock data")
    parser.add_argument("--ticker", "-t", help="Single ticker to update (optional)")
    parser.add_argument("--period", "-p", default="3mo", 
                       help="Data period: 1d, 5d, 1mo, 3mo, 6mo, 1y (default: 3mo)")
    parser.add_argument("--max-entries", "-m", type=int, default=500,
                       help="Maximum entries to retain (default: 500)")
    args = parser.parse_args()
    
    if args.ticker:
        # Update single ticker
        save_stock_data(args.ticker.upper(), max_entries=args.max_entries, period=args.period)
    else:
        # Update all tickers
        save_all_stock_data(max_entries=args.max_entries, period=args.period)
    
    # Final cleanup
    close_db_connection()
    gc.collect()
