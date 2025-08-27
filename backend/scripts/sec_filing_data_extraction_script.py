import logging
import requests
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from pymongo import MongoClient
from lxml import etree
from io import StringIO
import re

# MongoDB setup
headers = {'User-Agent': 'k (k@example.com)'}  # Replace with your name and email
client = MongoClient("mongodb+srv://koratpratik2001:3UTSYp6E2nlQixgW@cmpe272project.j7rxj.mongodb.net/?retryWrites=true&w=majority&appName=Cmpe272Project")  # Replace with your MongoDB URI if different
db = client["sec_data"]


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("form4_scraper.log"),
        logging.StreamHandler()
    ]
)

# List of tickers and CIKs
ticker_cik_mapping = {
    "AAPL": "0000320193",
    "NVDA": "0001045810",
    "META": "0001326801"
}

# Headers for SEC requests
headers = {
    'User-Agent': 'korat pratik (pratikkorat1@gmail.com)'  # Replace with your actual name and email
}

def fetch_form_4_links(cik):
    logging.info(f"Fetching Form 4 links for CIK: {cik}")
    filing_metadata_url = f'https://data.sec.gov/submissions/CIK{cik}.json'

    try:
        filing_metadata = requests.get(filing_metadata_url, headers=headers).json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to fetch metadata for CIK {cik}: {e}")
        return []

    recent_filings = pd.DataFrame(filing_metadata['filings']['recent'])
    recent_filings['filingDate'] = pd.to_datetime(recent_filings['filingDate'])
    one_year_ago = datetime.now() - timedelta(days=365)
    form_4_filings = recent_filings[(recent_filings['filingDate'] > one_year_ago) & (recent_filings['form'] == '4')]

    form_4_links = []
    for accession_number in form_4_filings['accessionNumber']:
        formatted_accession_number = accession_number.replace("-", "")
        index_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{formatted_accession_number}/index.html"

        try:
            index_response = requests.get(index_url, headers=headers)
            soup = BeautifulSoup(index_response.text, 'html.parser')
            for link in soup.find_all('a'):
                if link.text.endswith('.txt'):
                    form_4_links.append(f"https://www.sec.gov{link['href']}")
                    break
        except requests.exceptions.RequestException as e:
            logging.error(f"Failed to fetch Form 4 link for accession {accession_number} of CIK {cik}: {e}")

    logging.info(f"Fetched {len(form_4_links)} Form 4 links for CIK {cik}")
    return form_4_links

def extract_details_from_form4(form4_url):
    logging.info(f"Extracting details from Form 4 URL: {form4_url}")
    try:
        response = requests.get(form4_url, headers=headers)
        if response.status_code != 200:
            logging.error(f"Failed to fetch data from {form4_url}. Status code: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching Form 4 data from {form4_url}: {e}")
        return None

    sec_data = response.text
    filing_date_match = re.search(r"<FILED AS OF DATE:\s+(\d+)", sec_data)
    filing_date = datetime.strptime(filing_date_match.group(1), '%Y%m%d').date() if filing_date_match else None

    parser = etree.XMLParser(recover=True)
    tree = etree.parse(StringIO(sec_data), parser)

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

    logging.info(f"Extracted data from {form4_url}")
    return extracted_data

def flatten_data_list(data_list):
    flattened_data = []

    for data in data_list:
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
            flattened_data.append(flat_entry)

    return flattened_data

def insert_form4_data(ticker, cik):
    logging.info(f"Processing {ticker} with CIK {cik}")
    collection = db[f"form_4_links_{ticker}"]
    collection.delete_many({})  # Clear existing data

    form_4_links = fetch_form_4_links(cik)
    raw_data = []

    for link in form_4_links:
        data = extract_details_from_form4(link)
        if data:
            raw_data.append(data)

    flattened_data = flatten_data_list(raw_data)
    if flattened_data:
        collection.insert_many(flattened_data)
        logging.info(f"Inserted {len(flattened_data)} records for {ticker} (CIK: {cik})")

# Main function to process all tickers
def main():
    for ticker, cik in ticker_cik_mapping.items():
        insert_form4_data(ticker, cik)
    logging.info("Finished processing all tickers")

# Execute the script
if __name__ == "__main__":
    main()
