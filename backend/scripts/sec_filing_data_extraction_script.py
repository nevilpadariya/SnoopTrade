"""
SEC Form 4 filing data extraction script with memory optimization.
Fetches insider trading data from SEC EDGAR and stores in MongoDB.
"""

import gc
import logging
import requests
import time
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from pymongo import MongoClient
from lxml import etree
from io import StringIO
from pathlib import Path
from dotenv import load_dotenv
import re
import os

# Load .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

# MongoDB setup - use lazy connection
MONGODB_URI = os.getenv("MONGODB_URI")
_client = None
_db = None


def get_db():
    """
    Get MongoDB database connection with lazy initialization.
    """
    global _client, _db
    if _client is None:
        _client = MongoClient(MONGODB_URI)
        _db = _client["sec_data"]
    return _db


def close_db_connection():
    """
    Close MongoDB connection to free resources.
    """
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None


# Set up logging
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler()
        ]
    )

# List of tickers and CIKs
ticker_cik_mapping = {
    "AAPL": "0000320193",
    "NVDA": "0001045810",
    "META": "0001326801",
    "GOOGL": "0001652044",
    "MSFT": "0000789019",
    "AMZN": "0001018724",
    "TSLA": "0001318605",
    "NFLX": "0001065280"
}

# Headers for SEC requests - SEC requires identifying User-Agent
headers = {
    'User-Agent': 'SnoopTrade Data Fetcher (contact@snooptrade.com)',
    'Accept-Encoding': 'gzip, deflate',
}

# Rate limiting settings
SEC_REQUEST_DELAY = 0.15  # SEC allows ~10 requests per second


def fetch_form_4_links(cik: str, days_back: int = 365) -> list:
    """
    Fetch Form 4 filing links for a given CIK.
    
    Args:
        cik: SEC CIK number
        days_back: Number of days to look back (default 365, use 30-90 for frequent updates)
    
    Returns:
        List of Form 4 filing URLs
    """
    logger.info(f"Fetching Form 4 links for CIK: {cik} (last {days_back} days)")
    filing_metadata_url = f'https://data.sec.gov/submissions/CIK{cik}.json'

    try:
        response = requests.get(filing_metadata_url, headers=headers, timeout=30)
        response.raise_for_status()
        filing_metadata = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch metadata for CIK {cik}: {e}")
        return []

    # Extract recent filings without loading into full DataFrame
    recent = filing_metadata.get('filings', {}).get('recent', {})
    if not recent:
        logger.warning(f"No recent filings found for CIK {cik}")
        return []
    
    # Process filings efficiently
    cutoff_date = datetime.now() - timedelta(days=days_back)
    form_4_links = []
    
    filing_dates = recent.get('filingDate', [])
    forms = recent.get('form', [])
    accession_numbers = recent.get('accessionNumber', [])
    
    # Process each filing
    for i, (filing_date_str, form, accession_number) in enumerate(zip(filing_dates, forms, accession_numbers)):
        # Only process Form 4 filings
        if form != '4':
            continue
            
        # Check date
        try:
            filing_date = datetime.strptime(filing_date_str, '%Y-%m-%d')
            if filing_date < cutoff_date:
                continue
        except ValueError:
            continue
        
        # Build URL and fetch link
        formatted_accession_number = accession_number.replace("-", "")
        index_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{formatted_accession_number}/index.html"

        try:
            time.sleep(SEC_REQUEST_DELAY)  # Rate limiting
            index_response = requests.get(index_url, headers=headers, timeout=15)
            soup = BeautifulSoup(index_response.text, 'html.parser')
            
            for link in soup.find_all('a'):
                if link.text and link.text.endswith('.txt'):
                    form_4_links.append(f"https://www.sec.gov{link['href']}")
                    break
            
            # Clean up soup object
            del soup
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Failed to fetch Form 4 link for accession {accession_number}: {e}")
            continue
        
        # Periodic garbage collection
        if i % 20 == 0:
            gc.collect()

    # Clean up
    del filing_metadata
    del recent
    gc.collect()
    
    logger.info(f"Fetched {len(form_4_links)} Form 4 links for CIK {cik}")
    return form_4_links


def extract_details_from_form4(form4_url: str) -> dict:
    """
    Extract transaction details from a Form 4 filing.
    
    Args:
        form4_url: URL to the Form 4 filing
        
    Returns:
        Dictionary containing extracted data or None on failure
    """
    try:
        time.sleep(SEC_REQUEST_DELAY)  # Rate limiting
        response = requests.get(form4_url, headers=headers, timeout=30)
        if response.status_code != 200:
            logger.warning(f"Failed to fetch {form4_url}. Status: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        logger.warning(f"Error fetching Form 4 from {form4_url}: {e}")
        return None

    sec_data = response.text
    filing_date_match = re.search(r"<FILED AS OF DATE:\s+(\d+)", sec_data)
    filing_date = None
    if filing_date_match:
        try:
            filing_date = datetime.strptime(filing_date_match.group(1), '%Y%m%d').date()
        except ValueError:
            pass

    try:
        xml_parser = etree.XMLParser(recover=True)
        tree = etree.parse(StringIO(sec_data), xml_parser)

        extracted_data = {
            "filing_date": filing_date,
            "issuer": {
                "name": tree.xpath("//issuer/issuerName/text()")[0] if tree.xpath("//issuer/issuerName/text()") else None,
                "cik": tree.xpath("//issuer/issuerCik/text()")[0] if tree.xpath("//issuer/issuerCik/text()") else None,
                "trading_symbol": tree.xpath("//issuer/issuerTradingSymbol/text()")[0] if tree.xpath(
                    "//issuer/issuerTradingSymbol/text()") else None,
            },
            "reporting_owner": {
                "name": tree.xpath("//reportingOwner/rptOwnerName/text()")[0] if tree.xpath(
                    "//reportingOwner/rptOwnerName/text()") else None,
                "cik": tree.xpath("//reportingOwner/rptOwnerCik/text()")[0] if tree.xpath(
                    "//reportingOwner/rptOwnerCik/text()") else None,
            },
            "transactions": []
        }

        for transaction in tree.xpath("//nonDerivativeTransaction | //derivativeTransaction"):
            extracted_data["transactions"].append({
                "transaction_date": transaction.xpath(".//transactionDate/value/text()")[0] if transaction.xpath(
                    ".//transactionDate/value/text()") else None,
                "security_title": transaction.xpath(".//securityTitle/value/text()")[0] if transaction.xpath(
                    ".//securityTitle/value/text()") else None,
                "transaction_code": transaction.xpath(".//transactionCode/text()")[0] if transaction.xpath(
                    ".//transactionCode/text()") else None,
                "shares": transaction.xpath(".//transactionShares/value/text()")[0] if transaction.xpath(
                    ".//transactionShares/value/text()") else None,
                "price_per_share": transaction.xpath(".//transactionPricePerShare/value/text()")[0] if transaction.xpath(
                    ".//transactionPricePerShare/value/text()") else None,
                "ownership_type": transaction.xpath(".//directOrIndirectOwnership/value/text()")[0] if transaction.xpath(
                    ".//directOrIndirectOwnership/value/text()") else None,
            })

        # Clean up
        del tree
        del sec_data
        
        return extracted_data
        
    except Exception as e:
        logger.warning(f"Error parsing Form 4 from {form4_url}: {e}")
        return None


def flatten_single_filing(data: dict) -> list:
    """
    Flatten a single filing's data into individual transaction records.
    More memory-efficient than batch processing.
    """
    flattened = []
    
    for transaction in data.get("transactions", []):
        flat_entry = {
            "filing_date": data.get("filing_date"),
            "issuer_name": data.get("issuer", {}).get("name"),
            "issuer_cik": data.get("issuer", {}).get("cik"),
            "trading_symbol": data.get("issuer", {}).get("trading_symbol"),
            "reporting_owner_name": data.get("reporting_owner", {}).get("name"),
            "reporting_owner_cik": data.get("reporting_owner", {}).get("cik"),
            "transaction_date": transaction.get("transaction_date"),
            "security_title": transaction.get("security_title"),
            "transaction_code": transaction.get("transaction_code"),
            "shares": transaction.get("shares"),
            "price_per_share": transaction.get("price_per_share"),
            "ownership_type": transaction.get("ownership_type"),
        }
        flattened.append(flat_entry)
    
    return flattened


def insert_form4_data(ticker: str, cik: str, days_back: int = 365, batch_size: int = 20):
    """
    Fetch and insert Form 4 data for a ticker.
    Uses batched processing for memory efficiency.
    
    Args:
        ticker: Stock ticker symbol
        cik: SEC CIK number
        days_back: Number of days to look back (use 30-90 for frequent updates)
        batch_size: Number of filings to process before inserting to DB
    """
    logger.info(f"Processing {ticker} with CIK {cik} (last {days_back} days)")
    
    db = get_db()
    collection = db[f"form_4_links_{ticker}"]
    
    # Clear existing data
    collection.delete_many({})
    
    # Fetch links
    form_4_links = fetch_form_4_links(cik, days_back=days_back)
    
    if not form_4_links:
        logger.info(f"No Form 4 filings found for {ticker}")
        gc.collect()
        return
    
    total_inserted = 0
    batch_data = []
    
    # Process filings in batches
    for i, link in enumerate(form_4_links):
        data = extract_details_from_form4(link)
        
        if data:
            flattened = flatten_single_filing(data)
            batch_data.extend(flattened)
            del data
            del flattened
        
        # Insert batch when it reaches batch_size
        if len(batch_data) >= batch_size or i == len(form_4_links) - 1:
            if batch_data:
                try:
                    collection.insert_many(batch_data)
                    total_inserted += len(batch_data)
                    logger.debug(f"Inserted batch of {len(batch_data)} records for {ticker}")
                except Exception as e:
                    logger.error(f"Error inserting batch for {ticker}: {e}")
                
                batch_data = []
                gc.collect()
        
        # Periodic progress log
        if (i + 1) % 50 == 0:
            logger.info(f"Processed {i + 1}/{len(form_4_links)} filings for {ticker}")
    
    logger.info(f"Inserted {total_inserted} records for {ticker} (CIK: {cik})")
    
    # Clean up
    del form_4_links
    gc.collect()


def insert_all_form4_data(days_back: int = 365):
    """
    Process all tickers with memory cleanup between each.
    
    Args:
        days_back: Number of days to look back
    """
    results = {"success": [], "failed": []}
    
    for ticker, cik in ticker_cik_mapping.items():
        try:
            logger.info(f"Starting {ticker}...")
            insert_form4_data(ticker, cik, days_back=days_back)
            results["success"].append(ticker)
            
            # Force garbage collection between tickers
            gc.collect()
            
            # Delay between tickers to respect rate limits
            time.sleep(2)
            
        except Exception as e:
            logger.error(f"Failed to process {ticker}: {e}")
            results["failed"].append(ticker)
            gc.collect()
    
    # Close connection when done
    close_db_connection()
    gc.collect()
    
    logger.info(f"Completed: {len(results['success'])} success, {len(results['failed'])} failed")
    return results


# Main function to process all tickers
def main():
    """Main entry point for command-line usage."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Fetch and store SEC Form 4 data")
    parser.add_argument("--ticker", "-t", help="Single ticker to update (optional)")
    parser.add_argument("--days", "-d", type=int, default=365,
                       help="Number of days to look back (default: 365, use 30-90 for frequent updates)")
    args = parser.parse_args()
    
    if args.ticker:
        ticker = args.ticker.upper()
        cik = ticker_cik_mapping.get(ticker)
        if cik:
            insert_form4_data(ticker, cik, days_back=args.days)
        else:
            logger.error(f"Unknown ticker: {ticker}")
    else:
        insert_all_form4_data(days_back=args.days)
    
    # Final cleanup
    close_db_connection()
    gc.collect()
    logger.info("Finished processing")


# Execute the script
if __name__ == "__main__":
    main()
