from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from routers.auth_router import auth_router
from routers.sec_router import sec_router
from routers.stock_router import stock_router
from routers.forecast_router import forecast_router
from routers.admin_router import admin_router
from scheduler import start_scheduler, shutdown_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NoCacheDataMiddleware(BaseHTTPMiddleware):
    """Set Cache-Control so stock and SEC data are not cached by browsers or proxies."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.scope.get("path", "")
        if path.startswith("/stocks/") or path.startswith("/transactions/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Starts the scheduler on startup and shuts it down on shutdown."""
    logger.info("Starting application...")
    start_scheduler()
    logger.info("Application started successfully")
    yield
    logger.info("Shutting down application...")
    shutdown_scheduler()
    logger.info("Application shut down successfully")


app = FastAPI(lifespan=lifespan)

app.add_middleware(NoCacheDataMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(sec_router, tags=["SecEdgar"])
app.include_router(stock_router, tags=["Stocks"])
app.include_router(forecast_router, tags=["Forecasts"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])


@app.get("/")
async def welcome():
    return {"message": "Welcome to the API!"}


@app.get("/health")
async def health():
    """Health check for load balancers and App Platform."""
    return {"status": "ok"}
