import os
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging

from routers.auth_router import auth_router
from routers.sec_router import sec_router
from routers.stock_router import stock_router
from routers.forecast_router import forecast_router
from routers.admin_router import admin_router
from routers.prefetch_router import prefetch_router
from scheduler import start_scheduler, shutdown_scheduler
from services.stock_service import ensure_indexes
from utils.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NoCacheDataMiddleware(BaseHTTPMiddleware):
    """Set Cache-Control so stock and SEC data are not cached by browsers or proxies."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.scope.get("path", "")
        # Only force no-cache if the router hasn't already set a Cache-Control header
        if (path.startswith("/stocks/") or path.startswith("/transactions/")) and "cache-control" not in response.headers:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "same-origin"
        # Content-Security-Policy is complex and might break things (e.g. inline scripts/styles), 
        # so proceeding cautiously without strict CSP for now unless requested.
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Starts the scheduler on startup and shuts it down on shutdown."""
    logger.info("Starting application...")
    ensure_indexes()
    start_scheduler()
    logger.info("Application started successfully")
    yield
    logger.info("Shutting down application...")
    shutdown_scheduler()
    logger.info("Application shut down successfully")


app = FastAPI(lifespan=lifespan)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# GZip: compress JSON responses > 500 bytes (huge win for mobile over WiFi)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(NoCacheDataMiddleware)
_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]
_frontend_url = os.getenv("FRONTEND_URL", "")
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(sec_router, tags=["SecEdgar"])
app.include_router(stock_router, tags=["Stocks"])
app.include_router(forecast_router, tags=["Forecasts"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(prefetch_router, tags=["Prefetch"])


@app.get("/")
async def welcome():
    return {"message": "Welcome to the API!"}


@app.get("/health")
async def health():
    """Health check for load balancers and App Platform."""
    return {"status": "ok"}
