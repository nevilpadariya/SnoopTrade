#!/usr/bin/env python3
"""
Seed a test user into the MongoDB 'users' database.
Run from the backend directory:
    python scripts/seed_test_user.py
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient
import bcrypt

# Load env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
if not DATABASE_URL:
    print("❌ Missing MONGODB_URI / MONGO_URI in .env")
    sys.exit(1)

# ─── Test user credentials ───────────────────────────
TEST_EMAIL    = "testuser@snooptrade.com"
TEST_PASSWORD = "Test@1234"
TEST_NAME     = "Test User"
# ─────────────────────────────────────────────────────

client = MongoClient(DATABASE_URL, serverSelectionTimeoutMS=10000)
db = client["users"]

# Check if already exists
existing = db.users.find_one({"email": TEST_EMAIL})
if existing:
    print(f"⚠️  Test user already exists: {TEST_EMAIL}")
    print(f"   Password: {TEST_PASSWORD}")
    sys.exit(0)

hashed = bcrypt.hashpw(TEST_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

new_user = {
    "name": TEST_NAME,
    "email": TEST_EMAIL,
    "hashed_password": hashed,
    "created_at": datetime.now(timezone.utc),
    "login_type": "normal",
    "first_name": "Test",
    "family_name": "User",
}

db.users.insert_one(new_user)
print("✅ Test user created successfully!")
print(f"   Email:    {TEST_EMAIL}")
print(f"   Password: {TEST_PASSWORD}")
client.close()
