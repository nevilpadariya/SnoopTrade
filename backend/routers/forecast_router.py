from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from starlette import status
from datetime import timedelta
from services.auth_services import decode_access_token
import logging
from models.forecast import ForecastInput, ForecastOutput
from dateutil.parser import parse

forecast_router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def get_current_user(token: str = Depends(oauth2_scheme)):
    user = decode_access_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def compute_rsi(series: pd.Series, window: int) -> pd.Series:
    """Compute Relative Strength Index (RSI)."""
    delta = series.diff()
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    roll_up = up.rolling(window).mean()
    roll_down = down.rolling(window).mean()
    rs = roll_up / roll_down
    return 100 - (100 / (1 + rs))


def prepare_training_data(data: List[ForecastInput]) -> pd.DataFrame:
    """Prepare and clean training data for Prophet."""
    df = pd.DataFrame([
        {
            "ds": parse(item.date),
            "y": item.open,
            "high": item.high,
            "low": item.low,
            "close": item.close
        }
        for item in data
    ])
    df = df.sort_values('ds')
    three_months_ago = df['ds'].max() - timedelta(days=90)
    df = df[df['ds'] >= three_months_ago]
    df['volatility'] = df['y'].rolling(window=5).std()
    df['returns'] = df['y'].pct_change()
    df['rolling_mean'] = df['y'].rolling(window=5).mean()
    df['ema'] = df['y'].ewm(span=3, adjust=False).mean()
    df['rsi'] = compute_rsi(df['y'], window=3)
    for lag in range(1, 4):
        df[f'lag_{lag}'] = df['y'].shift(lag)
    df = df.ffill().bfill()

    return df


def fallback_forecast(df: pd.DataFrame, periods: int = 30) -> List[ForecastOutput]:
    """Simple trend-based forecast when Prophet/Stan optimization fails (e.g. in containers)."""
    if len(df) < 2:
        last = float(df["y"].iloc[-1]) if len(df) else 0.0
        base_date = df["ds"].iloc[-1] if len(df) else pd.Timestamp.now()
        return [
            ForecastOutput(
                date=(base_date + timedelta(days=i)).strftime("%Y-%m-%d"),
                open=last, high=last, low=last, close=None,
                trend=last, trend_lower=last, trend_upper=last,
                yhat_lower=last, yhat_upper=last, momentum=0.0, acceleration=0.0,
            )
            for i in range(1, periods + 1)
        ]
    y = df["y"].values
    x = np.arange(len(y))
    slope = np.polyfit(x, y, 1)[0]
    last_val = float(y[-1])
    last_date = df["ds"].iloc[-1]
    std = float(np.nanstd(y)) if len(y) > 1 else 0.0
    output = []
    for i in range(1, periods + 1):
        d = last_date + timedelta(days=i)
        trend_val = last_val + slope * i
        band = max(std * 0.5, abs(slope) * 2)
        output.append(ForecastOutput(
            date=d.strftime("%Y-%m-%d"),
            open=trend_val,
            high=trend_val + band,
            low=max(0.0, trend_val - band),
            close=None,
            trend=trend_val,
            trend_lower=max(0.0, trend_val - band),
            trend_upper=trend_val + band,
            yhat_lower=max(0.0, trend_val - band),
            yhat_upper=trend_val + band,
            momentum=float(slope),
            acceleration=0.0,
        ))
    return output


@forecast_router.post("/future", response_model=List[ForecastOutput])
async def generate_forecast(
        data: List[ForecastInput],
        user: dict = Depends(get_current_user),
):
    """Generate a 30-day forecast. Uses Prophet when possible; falls back to trend-based forecast if Prophet/Stan fails (e.g. in containers)."""
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data provided for forecasting.",
        )
    df = prepare_training_data(data)
    if len(df) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Need at least 2 data points for forecasting.",
        )
    y = df["y"]
    if np.any(np.isnan(y)) or np.any(np.isinf(y)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid values (NaN or Inf) in price data.",
        )

    try:
        from prophet import Prophet
        model = Prophet(
            growth="linear",
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            interval_width=0.95,
        )
        model.fit(df[["ds", "y"]])

        future = model.make_future_dataframe(periods=30, freq="D", include_history=False)
        forecast = model.predict(future)

        result = forecast[["ds", "yhat", "yhat_lower", "yhat_upper", "trend", "trend_lower", "trend_upper"]].copy()
        result.loc[:, "momentum"] = np.gradient(result["trend"])
        result.loc[:, "acceleration"] = np.gradient(result["momentum"])

        output = [
            ForecastOutput(
                date=row["ds"].strftime("%Y-%m-%d"),
                open=float(row["yhat"]),
                high=float(row["yhat_upper"]),
                low=float(row["yhat_lower"]),
                close=None,
                trend=float(row["trend"]),
                trend_lower=float(row["trend_lower"]),
                trend_upper=float(row["trend_upper"]),
                yhat_lower=float(row["yhat_lower"]),
                yhat_upper=float(row["yhat_upper"]),
                momentum=float(row["momentum"]),
                acceleration=float(row["acceleration"]),
            )
            for _, row in result.iterrows()
        ]
        return output

    except Exception as e:
        logging.warning("Prophet forecast failed, using fallback: %s", str(e))
        return fallback_forecast(df, periods=30)