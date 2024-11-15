from pydantic import BaseModel, Field
from typing import Optional

class StockDataModel(BaseModel):
    ticker: str = Field(..., description="Ticker symbol of the stock")
    date: str = Field(..., description="Date of the stock data")
    open: Optional[float] = Field(None, description="Opening price")
    high: Optional[float] = Field(None, description="High price")
    low: Optional[float] = Field(None, description="Low price")
    close: Optional[float] = Field(None, description="Closing price")
    volume: Optional[float] = Field(None, description="Volume of shares traded")
    dividends: Optional[float] = Field(None, description="Dividends")
    stock_splits: Optional[float] = Field(None, description="Stock splits")
