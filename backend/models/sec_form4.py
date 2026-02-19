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
    shares_owned_following_transaction: Optional[str] = Field(
        None, description="Shares owned following the reported transaction"
    )
    price_per_share: Optional[str] = Field(None, description="Price per share")
    ownership_type: Optional[str] = Field(None, description="Ownership type")
    is_director: Optional[str] = Field(None, description="Director relationship flag from filing")
    is_officer: Optional[str] = Field(None, description="Officer relationship flag from filing")
    is_ten_percent_owner: Optional[str] = Field(None, description="10% owner relationship flag from filing")
    officer_title: Optional[str] = Field(None, description="Officer title from filing")
