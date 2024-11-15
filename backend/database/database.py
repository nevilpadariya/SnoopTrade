from pymongo import MongoClient, errors

from motor.motor_asyncio import AsyncIOMotorClient



DATABASE_URL = "mongodb+srv://koratpratik2001:3UTSYp6E2nlQixgW@cmpe272project.j7rxj.mongodb.net/?retryWrites=true&w=majority&appName=Cmpe272Project"

client = MongoClient(DATABASE_URL)

DATABASE_SEC = "sec_data"
DATABASE_STOCK = "stock_data"
DATABASE_USER = "users"

# client = AsyncIOMotorClient(DATABASE_URL)
sec_db = client[DATABASE_SEC]
stock_db = client[DATABASE_STOCK]
user_db = client[DATABASE_USER]



