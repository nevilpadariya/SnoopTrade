#!/usr/bin/env python3
"""
MongoDB Connection Test Script
Tests the MongoDB connection and validates the URI format.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

def validate_mongodb_uri(uri: str):
    """Validate MongoDB URI format."""
    print("\n=== MongoDB URI Validation ===")
    
    if not uri:
        print("❌ ERROR: MONGODB_URI environment variable is not set")
        return False
    
    print(f"✓ MONGODB_URI is set")
    print(f"  URI starts with: {uri[:30]}...")
    
    if not uri.startswith(("mongodb://", "mongodb+srv://")):
        print(f"❌ ERROR: Invalid MongoDB URI format")
        print(f"  Must start with 'mongodb://' or 'mongodb+srv://'")
        return False
    
    print(f"✓ URI format is valid")
    
    # Check for common issues
    if "mongodb+srv://" in uri:
        try:
            parts = uri.split("@")
            if len(parts) < 2:
                print(f"❌ ERROR: MongoDB URI missing '@' delimiter")
                return False
            
            hostname_part = parts[1].split("/")[0].split("?")[0]
            print(f"✓ Hostname: {hostname_part}")
            
            # Check for suspicious patterns
            if "srvio.net" in hostname_part and "mongodb.net" not in hostname_part:
                print(f"⚠️  WARNING: Hostname looks suspicious: '{hostname_part}'")
                print(f"    MongoDB Atlas URLs typically end with '.mongodb.net'")
                print(f"    Please verify this is correct")
            
        except Exception as e:
            print(f"❌ ERROR parsing MongoDB URI: {e}")
            return False
    
    return True

def test_connection(uri: str):
    """Test MongoDB connection."""
    print("\n=== MongoDB Connection Test ===")
    
    try:
        print("Attempting to connect to MongoDB...")
        client = MongoClient(
            uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000
        )
        
        # Test the connection
        print("Testing connection with ping command...")
        client.admin.command('ping')
        
        print("✓ Successfully connected to MongoDB!")
        
        # List databases
        print("\nAvailable databases:")
        dbs = client.list_database_names()
        for db in dbs:
            print(f"  - {db}")
        
        # Check for expected databases
        expected_dbs = ["sec_data", "stock_data", "users"]
        print("\nExpected databases:")
        for db_name in expected_dbs:
            if db_name in dbs:
                print(f"  ✓ {db_name} - exists")
            else:
                print(f"  ⚠️  {db_name} - not found (will be created on first insert)")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed!")
        print(f"   Error: {e}")
        return False

def main():
    """Main test function."""
    print("=" * 50)
    print("MongoDB Connection Test")
    print("=" * 50)
    
    mongodb_uri = os.getenv("MONGODB_URI")
    
    # Step 1: Validate URI
    if not validate_mongodb_uri(mongodb_uri):
        print("\n" + "=" * 50)
        print("❌ VALIDATION FAILED")
        print("=" * 50)
        print("\nPlease check your MONGODB_URI in the .env file")
        sys.exit(1)
    
    # Step 2: Test connection
    if not test_connection(mongodb_uri):
        print("\n" + "=" * 50)
        print("❌ CONNECTION FAILED")
        print("=" * 50)
        print("\nTroubleshooting steps:")
        print("1. Verify your MongoDB Atlas cluster is running")
        print("2. Check network access settings in MongoDB Atlas")
        print("3. Verify database user credentials are correct")
        print("4. Ensure the connection string is copied correctly")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✓ ALL TESTS PASSED")
    print("=" * 50)
    print("\nYour MongoDB connection is working correctly!")
    print("You can now run the data extraction scripts.")
    sys.exit(0)

if __name__ == "__main__":
    main()
