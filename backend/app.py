# app.py

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from routers.auth_router import auth_router
from routers.sec_router import sec_router
from routers.stock_router import stock_router
from routers.forecast_router import forecast_router
from routers.admin_router import admin_router
from scheduler import start_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI.
    Starts the scheduler on startup and shuts it down on shutdown.
    """
    # Startup
    logger.info("Starting application...")
    start_scheduler()
    logger.info("Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    shutdown_scheduler()
    logger.info("Application shut down successfully")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Update this to match your frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (e.g., GET, POST, OPTIONS)
    allow_headers=["*"],  # Allow all headers
)
# Include the routers with tags for Swagger organization
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(sec_router, tags=["SecEdgar"])
app.include_router(stock_router, tags=["Stocks"])
app.include_router(forecast_router, tags=["Forecasts"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])

@app.get("/")
async def welcome():
    return {"message": "Welcome to the API!"}