# models.py
from pydantic import BaseModel, Field
from typing import Optional


class TransactionModel(BaseModel):
    filing_date: Optional[str] = Field(None, description="The filing date of the form")
    issuer_name: Optional[str] = Field(None, description="Name of the issuer")
    issuer_cik: Optional[str] = Field(None, description="Issuer CIK code")
    trading_symbol: Optional[str] = Field(None, description="Trading symbol")
    reporting_owner_name: Optional[str] = Field(None, description="Name of the reporting owner")
    reporting_owner_cik: Optional[str] = Field(None, description="Reporting owner's CIK")
    transaction_date: Optional[str] = Field(None, description="Date of the transaction")
    security_title: Optional[str] = Field(None, description="Title of the security")
    transaction_code: Optional[str] = Field(None, description="Transaction code")
    shares: Optional[str] = Field(None, description="Number of shares involved")
    price_per_share: Optional[str] = Field(None, description="Price per share")
    ownership_type: Optional[str] = Field(None, description="Ownership type")
