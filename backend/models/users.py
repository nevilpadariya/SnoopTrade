from pydantic import BaseModel, EmailStr, Field

from pydantic import BaseModel, EmailStr, Field


# Define your User model
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