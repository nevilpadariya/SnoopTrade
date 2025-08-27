import yfinance as yf
from pymongo import UpdateOne, errors
from dateutil import parser
from datetime import datetime, timedelta
from pymongo import MongoClient
import logging
import os

# MongoDB setup
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://your-default-uri")
client = MongoClient(MONGODB_URI)
db = client["stock_data"]

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("stock_data.log"),
        logging.StreamHandler()
    ]
)

# Function to fetch stock data from Yahoo Finance
def fetch_stock_data(ticker: str, period: str = "1y") -> tuple:
    """
    Fetches stock data for the specified ticker and period.

    Args:
        ticker (str): Stock ticker symbol.
        period (str): Period for which to fetch data (default: '1y').

    Returns:
        tuple: A list of stock data and an error message (if any).
    """
    logging.info(f"Fetching stock data for ticker: {ticker}")
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)

    if hist.empty:
        logging.warning(f"No data found for ticker: {ticker}")
        return None, "No data found for this ticker."

    data = hist.reset_index().to_dict(orient='records')
    logging.info(f"Fetched {len(data)} records for ticker: {ticker}")
    return data, None

# Ensure index for efficient updates
def ensure_index(collection):
    """
    Ensures an index on the 'Date' field to optimize upsert performance.
    """
    try:
        collection.create_index([("Date", 1)], unique=True)
        logging.info("Ensured index on Date field.")
    except errors.OperationFailure as e:
        logging.error(f"Error ensuring index on Date field: {e}")

# Insert stock data into MongoDB
def insert_stock_data(ticker: str, stock_data: list, max_entries: int = 500):
    """
    Inserts new stock data into the database while keeping only the latest max_entries.

    Args:
        ticker (str): Stock ticker symbol.
        stock_data (list): Stock data to insert.
        max_entries (int): Maximum number of entries to retain.
    """
    collection = db[f"stock_data_{ticker}"]

    # Ensure index on 'Date' field
    ensure_index(collection)

    # Filter out data older than one year
    one_year_ago = datetime.now() - timedelta(days=365)
    collection.delete_many({"Date": {"$lt": one_year_ago}})

    # Prepare bulk operations
    operations = [
        UpdateOne(
            {"Date": parser.parse(str(data['Date']))},
            {"$set": {**data, "ticker": ticker}},
            upsert=True
        )
        for data in stock_data
    ]

    if operations:
        try:
            collection.bulk_write(operations, ordered=False)
            logging.info(f"Bulk insert completed for {ticker}.")

            # Retain only the latest max_entries
            entries_to_keep = list(collection.find().sort("Date", -1).limit(max_entries))
            if len(entries_to_keep) == max_entries:
                oldest_date_to_keep = entries_to_keep[-1]["Date"]
                collection.delete_many({"Date": {"$lt": oldest_date_to_keep}})
                logging.info(f"Trimmed old entries, keeping latest {max_entries} records.")
        except errors.BulkWriteError as bwe:
            logging.error(f"Bulk write error: {bwe.details}")

def save_stock_data(ticker: str, max_entries: int = 500):
    """
    Fetches and saves stock data for a given ticker.

    Args:
        ticker (str): Stock ticker symbol.
        max_entries (int): Maximum number of entries to retain in the database.
    """
    stock_data, error = fetch_stock_data(ticker)

    if error:
        logging.error(f"Error for {ticker}: {error}")
        return

    if not stock_data:
        logging.warning(f"No stock data available for {ticker}.")
        return

    insert_stock_data(ticker, stock_data, max_entries)
    logging.info(f"Data for {ticker} saved to the database.")

# Main entry point
if __name__ == "__main__":
    # Define your list of tickers
    ticker_symbols = ["META"]

    # Loop through each ticker in the list and save data
    for ticker_symbol in ticker_symbols:
        save_stock_data(ticker_symbol, max_entries=500)
