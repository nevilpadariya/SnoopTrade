from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Form, Request
from fastapi.security import OAuth2PasswordBearer
from utils.limiter import limiter

from database.database import user_db as db
from models.users import User, UpdateUser, MessageResponse, TokenResponse, RefreshTokenRequest
from services.auth_services import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    decode_access_google_token,
    hash_refresh_token_id,
)

auth_router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def _persist_refresh_token(email: str, refresh_token_id: str, refresh_expires_at: datetime) -> None:
    db.users.update_one(
        {"email": email},
        {
            "$set": {
                "refresh_token_jti_hash": hash_refresh_token_id(refresh_token_id),
                "refresh_token_expires_at": refresh_expires_at,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )


def _issue_tokens_for_user(user: Dict[str, Any]) -> TokenResponse:
    access_token = create_access_token(data={"sub": user["email"]})
    refresh_token, refresh_token_id, refresh_expires_at = create_refresh_token(data={"sub": user["email"]})
    _persist_refresh_token(user["email"], refresh_token_id, refresh_expires_at)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        email=user["email"],
        requires_password=not bool(user.get("hashed_password")),
    )


@auth_router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def signup(request: Request, user: User) -> MessageResponse:
    """Register a new user."""
    user_exists = db.users.find_one({"email": user.email})
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )

    hashed_password = hash_password(user.password)
    name_parts = user.name.strip().split(" ", 1)
    new_user = {
        "name": user.name,
        "email": user.email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc),
        "login_type": "normal",
        "first_name": name_parts[0],
        "family_name": name_parts[1] if len(name_parts) > 1 else ""
    }
    db.users.insert_one(new_user)
    return MessageResponse(message="User created successfully")


@auth_router.post("/token", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    username: str = Form(...),
    password: Optional[str] = Form(None),
    login_type: str = Form("normal"),
    token: Optional[str] = Form(None)
) -> TokenResponse:
    """Authenticate user and return access token."""
    
    user = None

    if login_type == "normal":
        user = db.users.find_one({"email": username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found. Please sign up to access our services."
            )
        if not user.get("hashed_password"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account uses Google login. Please sign in with Google or set a password in Account Settings."
            )
        if not password or not verify_password(password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password."
            )

    elif login_type == "google":
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token is required for Google login."
            )

        decoded_token = decode_access_google_token(token)
        if not decoded_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token."
            )

        email = decoded_token.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token is missing email information."
            )

        # Secure Lookup: Find user by the VERIFIED email from Google, not the form username
        user = db.users.find_one({"email": email})

        if not user:
            new_user = {
                "first_name": decoded_token.get("given_name", ""),
                "last_name": decoded_token.get("family_name", ""),
                "name": decoded_token.get("given_name", "") + " " + decoded_token.get("family_name", ""),
                "email": email,
                "hashed_password": None,
                "created_at": datetime.now(timezone.utc),
                "login_type": "google"
            }
            try:
                db.users.insert_one(new_user)
                user = new_user
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create new user for Google login."
                )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid login type."
        )

    return _issue_tokens_for_user(user)


@auth_router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
async def refresh_access_token(request: Request, payload: RefreshTokenRequest) -> TokenResponse:
    """Rotate refresh token and mint a new access token."""
    decoded = decode_refresh_token(payload.refresh_token)
    if not decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    email = decoded.get("sub")
    token_id = decoded.get("jti")
    if not email or not token_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload")

    user = db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    stored_hash = user.get("refresh_token_jti_hash")
    stored_exp = user.get("refresh_token_expires_at")
    if not stored_hash or not stored_exp or hash_refresh_token_id(token_id) != stored_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    if stored_exp and isinstance(stored_exp, datetime):
        if stored_exp.tzinfo is None:
            stored_exp = stored_exp.replace(tzinfo=timezone.utc)
        if stored_exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")

    return _issue_tokens_for_user(user)


@auth_router.post("/logout", response_model=MessageResponse)
@limiter.limit("20/minute")
async def logout(request: Request, token: str = Depends(oauth2_scheme)) -> MessageResponse:
    """Revoke the current refresh token for the authenticated user."""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    email = payload.get("sub")
    if email:
        db.users.update_one(
            {"email": email},
            {"$unset": {"refresh_token_jti_hash": "", "refresh_token_expires_at": ""}},
        )
    return MessageResponse(message="Logged out successfully")


@auth_router.get("/me", response_model=Dict[str, Any])
@limiter.limit("60/minute")
async def get_current_user(request: Request, token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Return current user info (excluding password)."""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.users.find_one({"email": payload.get("sub")}, {"hashed_password": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    user.pop("_id", None)
    return user


@auth_router.put("/me/update", response_model=MessageResponse)
@limiter.limit("10/minute")
async def update_user_info(request: Request, update_info: UpdateUser, token: str = Depends(oauth2_scheme)) -> MessageResponse:
    """Update current user name and/or password."""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_email = payload.get("sub")
    user = db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = {}
    if update_info.name:
        update_data["name"] = update_info.name
    if update_info.password:
        # Require current password verification for users who already have one
        if user.get("hashed_password") and not user.get("login_type") == "google":
            if not update_info.current_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is required to change password."
                )
            if not verify_password(update_info.current_password, user["hashed_password"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Current password is incorrect."
                )
        update_data["hashed_password"] = hash_password(update_info.password)
        if user.get("login_type") == "google":
            update_data["login_type"] = "both"

    if update_data:
        db.users.update_one({"email": user_email}, {"$set": update_data})

    return MessageResponse(message="User information updated successfully")
