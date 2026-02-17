from typing import Optional

from pydantic import BaseModel

class ForecastInput(BaseModel):
    date: str  # ISO date string
    open: Optional[float]
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None

class ForecastOutput(BaseModel):
    date: str
    open: Optional[float]
    high: Optional[float]
    low: Optional[float]
    close: Optional[float]
    trend: Optional[float]
    trend_lower: Optional[float]
    trend_upper: Optional[float]
    yhat_lower: Optional[float]
    yhat_upper: Optional[float]
    momentum: Optional[float]
    acceleration: Optional[float]
    insider_signal: Optional[float] = 0.0