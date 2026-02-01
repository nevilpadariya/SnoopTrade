from datetime import datetime, timedelta
from database.database import stock_db
from typing import List
from models.stock_data import StockDataModel
import pytz

TIME_PERIOD_DAYS = {
    "1w": 7,
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365
}

EASTERN = pytz.timezone("America/New_York")


def fetch_stock_data(ticker: str, time_period: str = "1y", limit: int = None) -> List[StockDataModel]:
    """
    Fetches and processes documents from the collection for the specified ticker and time period,
    optionally limiting the number of results. Uses Eastern time for the date window (market hours).
    """
    collection = stock_db[f"stock_data_{ticker}"]
    days_ago = TIME_PERIOD_DAYS.get(time_period, 365)
    now_eastern = datetime.now(EASTERN)
    start_date = (now_eastern - timedelta(days=days_ago)).replace(tzinfo=None)
    query = {"Date": {"$gte": start_date}}
    cursor = collection.find(query).sort("Date", -1)
    if limit:
        cursor = cursor.limit(limit)

    # Process each document in the cursor
    data_list = []
    for document in cursor:
        processed_document = StockDataModel(
            ticker=document["ticker"],
            date=document["Date"].isoformat(),
            open=float(document["Open"]),
            high=float(document["High"]),
            low=float(document["Low"]),
            close=float(document["Close"]),
            volume=int(document["Volume"]),
            dividends=float(document["Dividends"]),
            stock_splits=float(document["Stock Splits"])
        )
        data_list.append(processed_document)

    return data_list
