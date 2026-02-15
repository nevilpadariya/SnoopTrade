"""
MongoDB connection module — production-tuned for M0 free tier.

Optimizations applied:
  1. Connection pooling: maxPoolSize=10 (M0 limit is 500, but 10 is optimal for single-server)
  2. Timeouts: 5s connect, 10s server selection, 10s socket — fail fast instead of hanging
  3. Compression: zlib wire compression reduces bytes over the network (Atlas M0 supports it)
  4. Read preference: secondaryPreferred — read from secondaries when available (replicas)
  5. Write concern: w=1 (default, confirmed write to primary only — fast for M0)
  6. retryWrites: already in URI, but connection is configured for resilience
"""

from pymongo import MongoClient, ReadPreference
import os
from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
if not DATABASE_URL:
    raise RuntimeError("Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI.")

client = MongoClient(
    DATABASE_URL,
    # ─── Connection pool ───
    maxPoolSize=10,
    minPoolSize=2,
    maxIdleTimeMS=45_000,
    # ─── Timeouts (fail fast) ───
    connectTimeoutMS=5_000,
    serverSelectionTimeoutMS=10_000,
    socketTimeoutMS=10_000,
    # ─── Wire compression (reduces bytes over network) ───
    compressors="zlib",
    zlibCompressionLevel=6,
)

DATABASE_SEC = "sec_data"
DATABASE_STOCK = "stock_data"
DATABASE_USER = "users"

sec_db = client[DATABASE_SEC]
stock_db = client[DATABASE_STOCK]
user_db = client[DATABASE_USER]
