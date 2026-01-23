import bcrypt
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport.requests import Request

SECRET_KEY = "dajsrvbdjaslerhieofbsdjmcxfsdfksdkvldncvlsdkgjsdgksgksdhglsdkjg"  # Replace with a strong, randomly generated secret key
ALGORITHM = "HS256"


def decode_access_google_token(token: str):
    try:
        CLIENT_ID = "978139760528-bmaaljd4da3akanum226u4627h4iq98e.apps.googleusercontent.com"
        idinfo = id_token.verify_oauth2_token(token, Request(), CLIENT_ID)
        return idinfo
    except ValueError:
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
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
