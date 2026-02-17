from fastapi import APIRouter, HTTPException, Depends, Path
from fastapi.security import OAuth2PasswordBearer
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
import pandas as pd
import numpy as np
from starlette import status
from datetime import timedelta, datetime
from services.auth_services import decode_access_token
from services.sec_service import get_all_transactions
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


def build_insider_signal(ticker: str, date_range: pd.DatetimeIndex) -> pd.Series:
    """
    Query SEC Form 4 insider transactions and build a daily sentiment signal.
    Purchases = +1, Sales = -1, weighted by share volume and normalized.
    Returns a Series indexed by date with the insider signal value.
    """
    signal = pd.Series(0.0, index=date_range, name="insider_signal")

    try:
        transactions = get_all_transactions(ticker, "1y")
        if not transactions:
            return signal

        for txn in transactions:
            try:
                txn_date = pd.Timestamp(txn.transaction_date)
                if txn_date not in date_range:
                    # Find nearest date in range
                    diffs = abs(date_range - txn_date)
                    nearest_idx = diffs.argmin()
                    txn_date = date_range[nearest_idx]

                shares = float(txn.shares or 0)
                code = (txn.transaction_code or "").upper()

                if code == "P":  # Purchase
                    signal.loc[txn_date] += shares
                elif code == "S":  # Sale
                    signal.loc[txn_date] -= shares
            except Exception:
                continue

        # Normalize to [-1, 1] range for use as a regressor
        max_abs = signal.abs().max()
        if max_abs > 0:
            signal = signal / max_abs

    except Exception as e:
        logging.warning("Failed to build insider signal for %s: %s", ticker, e)

    return signal


def prepare_training_data(data: List[ForecastInput], ticker: Optional[str] = None) -> pd.DataFrame:
    """Prepare and clean training data for Prophet with optional insider signal."""
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

    # Use all available data instead of truncating to 90 days
    # (frontend already filters by user-selected time period)

    # Technical indicators
    df['volatility'] = df['y'].rolling(window=5).std()
    df['returns'] = df['y'].pct_change()
    df['rolling_mean'] = df['y'].rolling(window=5).mean()
    df['ema'] = df['y'].ewm(span=3, adjust=False).mean()
    df['rsi'] = compute_rsi(df['y'], window=3)
    for lag in range(1, 4):
        df[f'lag_{lag}'] = df['y'].shift(lag)

    # Add insider trading signal if ticker provided
    if ticker:
        insider = build_insider_signal(ticker, pd.DatetimeIndex(df['ds']))
        df['insider_signal'] = insider.values

    df = df.ffill().bfill()

    return df


def fallback_forecast(df: pd.DataFrame, periods: int = 30) -> List[ForecastOutput]:
    """
    Improved fallback using exponential weighted moving average (EWM)
    instead of simple linear regression. Produces more realistic curves.
    """
    if len(df) < 2:
        last = float(df["y"].iloc[-1]) if len(df) else 0.0
        base_date = df["ds"].iloc[-1] if len(df) else pd.Timestamp.now()
        return [
            ForecastOutput(
                date=(base_date + timedelta(days=i)).strftime("%Y-%m-%d"),
                open=last, high=last, low=last, close=None,
                trend=last, trend_lower=last, trend_upper=last,
                yhat_lower=last, yhat_upper=last,
                momentum=0.0, acceleration=0.0, insider_signal=0.0,
            )
            for i in range(1, periods + 1)
        ]

    y = df["y"].values
    last_date = df["ds"].iloc[-1]
    last_val = float(y[-1])

    # Calculate trend using EWM
    ewm_series = pd.Series(y).ewm(span=min(10, len(y)), adjust=False).mean()
    ewm_last = float(ewm_series.iloc[-1])

    # Daily drift from EWM trend
    if len(ewm_series) >= 2:
        recent_drifts = ewm_series.diff().tail(5)
        daily_drift = float(recent_drifts.mean())
    else:
        daily_drift = 0.0

    # Volatility for confidence bands
    std = float(np.nanstd(y[-min(20, len(y)):]))  # Recent volatility
    if std == 0:
        std = abs(daily_drift) * 2 if daily_drift != 0 else 1.0

    # Momentum decay: reduce drift over time for more realistic forecast
    decay_rate = 0.97

    # Get insider signal if available
    insider_val = float(df.get('insider_signal', pd.Series([0.0])).iloc[-1])

    output = []
    prev_trend = ewm_last
    prev_momentum = daily_drift

    for i in range(1, periods + 1):
        decayed_drift = daily_drift * (decay_rate ** i)
        trend_val = ewm_last + decayed_drift * i
        band = std * np.sqrt(i / periods) * 1.5  # Widening confidence band

        momentum = decayed_drift
        acceleration = momentum - prev_momentum

        output.append(ForecastOutput(
            date=(last_date + timedelta(days=i)).strftime("%Y-%m-%d"),
            open=round(trend_val, 2),
            high=round(trend_val + band, 2),
            low=round(max(0.01, trend_val - band), 2),
            close=None,
            trend=round(trend_val, 2),
            trend_lower=round(max(0.01, trend_val - band), 2),
            trend_upper=round(trend_val + band, 2),
            yhat_lower=round(max(0.01, trend_val - band), 2),
            yhat_upper=round(trend_val + band, 2),
            momentum=round(momentum, 4),
            acceleration=round(acceleration, 6),
            insider_signal=round(insider_val, 4),
        ))
        prev_momentum = momentum

    return output


@forecast_router.post("/future/{ticker}", response_model=List[ForecastOutput])
@forecast_router.post("/future", response_model=List[ForecastOutput])
async def generate_forecast(
        data: List[ForecastInput],
        user: dict = Depends(get_current_user),
        ticker: Optional[str] = None,
):
    """
    Generate a 30-day forecast using Prophet with insider trading signals.
    Falls back to EWM-based forecast if Prophet/Stan fails.
    """
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data provided for forecasting.",
        )

    # Prepare training data (runs sync DB call for insider signal)
    df = await run_in_threadpool(prepare_training_data, data, ticker)

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
            weekly_seasonality=True,     # Enable — stocks have weekly patterns
            daily_seasonality=False,
            changepoint_prior_scale=0.01,  # Smoother trend
            interval_width=0.95,
        )

        # Add technical regressors
        regressors = ['volatility', 'rolling_mean']
        if 'insider_signal' in df.columns:
            regressors.append('insider_signal')

        for reg in regressors:
            if reg in df.columns:
                model.add_regressor(reg)

        train_cols = ["ds", "y"] + [r for r in regressors if r in df.columns]
        model.fit(df[train_cols])

        future = model.make_future_dataframe(periods=30, freq="D", include_history=False)

        # Extend regressors into the future
        for reg in regressors:
            if reg in df.columns:
                last_val = float(df[reg].iloc[-1])
                future[reg] = last_val  # Use last known value as forward fill

        forecast = model.predict(future)

        result = forecast[["ds", "yhat", "yhat_lower", "yhat_upper", "trend", "trend_lower", "trend_upper"]].copy()
        result.loc[:, "momentum"] = np.gradient(result["trend"])
        result.loc[:, "acceleration"] = np.gradient(result["momentum"])

        # Get insider signal value for context
        insider_val = float(df['insider_signal'].iloc[-1]) if 'insider_signal' in df.columns else 0.0

        output = [
            ForecastOutput(
                date=row["ds"].strftime("%Y-%m-%d"),
                open=round(float(row["yhat"]), 2),
                high=round(float(row["yhat_upper"]), 2),
                low=round(float(row["yhat_lower"]), 2),
                close=None,
                trend=round(float(row["trend"]), 2),
                trend_lower=round(float(row["trend_lower"]), 2),
                trend_upper=round(float(row["trend_upper"]), 2),
                yhat_lower=round(float(row["yhat_lower"]), 2),
                yhat_upper=round(float(row["yhat_upper"]), 2),
                momentum=round(float(row["momentum"]), 4),
                acceleration=round(float(row["acceleration"]), 6),
                insider_signal=round(insider_val, 4),
            )
            for _, row in result.iterrows()
        ]
        return output

    except Exception as e:
        logging.warning("Prophet forecast failed, using fallback: %s", str(e))
        return fallback_forecast(df, periods=30)