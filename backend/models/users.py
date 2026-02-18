from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    name: str
    email: EmailStr
    password: str


class UpdateUser(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    email: str
    requires_password: bool = False


class MessageResponse(BaseModel):
    message: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=16)
