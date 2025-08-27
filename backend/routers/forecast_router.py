from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from prophet import Prophet
from starlette import status
from datetime import timedelta
from services.auth_services import decode_access_token
import logging
from models.forecast import ForecastInput, ForecastOutput
from dateutil.parser import parse  # Use flexible date parser

# FastAPI Router Setup
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
    # Convert input data to DataFrame
    df = pd.DataFrame([
        {
            "ds": parse(item.date),  # Use flexible date parser
            "y": item.open,
            "high": item.high,
            "low": item.low,
            "close": item.close
        }
        for item in data
    ])

    # Sort by date and filter for the last 90 days
    df = df.sort_values('ds')
    three_months_ago = df['ds'].max() - timedelta(days=90)
    df = df[df['ds'] >= three_months_ago]

    # Feature Engineering
    df['volatility'] = df['y'].rolling(window=5).std()
    df['returns'] = df['y'].pct_change()
    df['rolling_mean'] = df['y'].rolling(window=5).mean()
    df['ema'] = df['y'].ewm(span=3, adjust=False).mean()
    df['rsi'] = compute_rsi(df['y'], window=3)

    # Lagged Features
    for lag in range(1, 4):
        df[f'lag_{lag}'] = df['y'].shift(lag)

    # Handle missing values
    df = df.fillna(method='ffill').fillna(method='bfill')

    return df


def calculate_dynamic_capacity(df: pd.DataFrame) -> float:
    """Calculate dynamic capacity based on historical volatility and trend."""
    latest_price = df['y'].iloc[-1]
    volatility = df['y'].std()
    trend = (df['y'].iloc[-1] - df['y'].iloc[0]) / len(df)

    # Calculate capacity as a multiple of current price, adjusted for volatility and trend
    volatility_factor = 1 + (volatility / latest_price)
    trend_factor = 1 + max(0, trend / latest_price)

    return latest_price * volatility_factor * trend_factor * 2.5


@forecast_router.post("/future", response_model=List[ForecastOutput])
async def generate_forecast(
        data: List[ForecastInput],
        user: dict = Depends(get_current_user),
):
    """Generate a 30-day forecast using enhanced Prophet model without seasonality."""
    try:
        # Prepare training data
        df = prepare_training_data(data)

        # Calculate dynamic capacity
        capacity = calculate_dynamic_capacity(df)
        df['cap'] = capacity
        df['floor'] = 0  # Set floor to prevent negative predictions

        # Initialize Prophet with adjusted parameters
        model = Prophet(
            growth='logistic',
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.8,  # Increased to allow more flexibility in trend changes
            interval_width=0.95  # Adjusted for more confident prediction intervals
        )

        # Add regressors to the model
        regressors = ['volatility', 'returns', 'rolling_mean', 'ema', 'rsi', 'high', 'low', 'close']
        for regressor in regressors:
            model.add_regressor(regressor)

        # Fit the model
        model.fit(df[["ds", "y", "cap", "floor"] + regressors])

        # Generate future dates
        future = model.make_future_dataframe(periods=30, freq='D', include_history=False)

        # Add capacity, floor, and regressors to future dataframe
        future['cap'] = capacity
        future['floor'] = 0
        for regressor in regressors:
            future[regressor] = df[regressor].iloc[-1]  # Use the last known value for simplicity

        # Make predictions
        forecast = model.predict(future)

        # Extract relevant components
        result = forecast[["ds", "yhat", "yhat_lower", "yhat_upper", "trend", "trend_lower", "trend_upper"]]

        # Calculate additional metrics
        result.loc[:, 'momentum'] = np.gradient(result['trend'])
        result.loc[:, 'acceleration'] = np.gradient(result['momentum'])

        # Add random noise to the predictions
        noise_factor = 0.05  # Adjust the noise factor as needed
        result.loc[:, 'yhat'] += result['yhat'] * noise_factor * (np.random.rand(len(result)) - 0.5)
        result.loc[:, 'yhat_lower'] += result['yhat_lower'] * noise_factor * (np.random.rand(len(result)) - 0.5)
        result.loc[:, 'yhat_upper'] += result['yhat_upper'] * noise_factor * (np.random.rand(len(result)) - 0.5)

        # Format output
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

    except ValueError as ve:
        logging.error(f"ValueError: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ValueError: {str(ve)}"
        )
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )