from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    name: str
    email: EmailStr
    password: str


class UpdateUser(BaseModel):
    name: str
    password: str = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    email: str


class MessageResponse(BaseModel):
    message: str
