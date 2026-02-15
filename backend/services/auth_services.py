import os
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport.requests import Request

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable is required")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def decode_access_google_token(token: str):
    client_ids = [value.strip() for value in os.getenv("GOOGLE_CLIENT_IDS", "").split(",") if value.strip()]
    default_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if default_client_id and default_client_id not in client_ids:
        client_ids.append(default_client_id)

    if not client_ids:
        return None

    for client_id in client_ids:
        try:
            return id_token.verify_oauth2_token(token, Request(), client_id)
        except ValueError:
            continue

    return None

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
