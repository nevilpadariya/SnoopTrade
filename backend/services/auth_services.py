from passlib.context import CryptContext
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport.requests import Request

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "dajsrvbdjaslerhieofbsdjmcxfsdfksdkvldncvlsdkgjsdgksgksdhglsdkjg"  # Replace with a strong, randomly generated secret key
ALGORITHM = "HS256"


def decode_access_google_token(token: str):
    try:
        CLIENT_ID = "978139760528-bmaaljd4da3akanum226u4627h4iq98e.apps.googleusercontent.com"
        idinfo = id_token.verify_oauth2_token(token, Request(), CLIENT_ID)
        return idinfo
    except ValueError:
        return None

def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


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
