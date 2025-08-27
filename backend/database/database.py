from pymongo import MongoClient, errors
import os

from motor.motor_asyncio import AsyncIOMotorClient



DATABASE_URL = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
if not DATABASE_URL:
    raise RuntimeError("Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI.")

client = MongoClient(DATABASE_URL)

DATABASE_SEC = "sec_data"
DATABASE_STOCK = "stock_data"
DATABASE_USER = "users"

# client = AsyncIOMotorClient(DATABASE_URL)
sec_db = client[DATABASE_SEC]
stock_db = client[DATABASE_STOCK]
user_db = client[DATABASE_USER]



