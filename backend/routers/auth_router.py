from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Form, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator
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
from services.admin_access import is_admin_user

auth_router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

MAX_WATCHLIST_ITEMS = 20
MAX_RECENT_ITEMS = 12
MAX_WATCHLIST_GROUPS = 8
MAX_GROUP_NAME_LENGTH = 24


class WatchlistUpdateRequest(BaseModel):
    watchlist: list[str] = Field(default_factory=list, max_length=MAX_WATCHLIST_ITEMS)
    recent_tickers: list[str] = Field(default_factory=list, max_length=MAX_RECENT_ITEMS)
    watchlist_groups: Dict[str, list[str]] | None = None

    @staticmethod
    def _normalize_tickers(values: list[str], max_items: int) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for value in values:
            ticker = str(value or "").upper().strip()
            if not ticker or ticker in seen:
                continue
            if len(ticker) > 8:
                continue
            if not all(ch.isalnum() or ch in ".-" for ch in ticker):
                continue
            seen.add(ticker)
            normalized.append(ticker)
        return normalized[:max_items]

    @staticmethod
    def _normalize_group_name(value: str) -> str:
        compact = " ".join(str(value or "").strip().split())
        cleaned = "".join(ch for ch in compact if ch.isalnum() or ch in " -&_")
        return cleaned.strip()[:MAX_GROUP_NAME_LENGTH]

    @classmethod
    def _normalize_groups(
        cls,
        groups: Dict[str, list[str]] | None,
        allowed_tickers: list[str] | None = None,
    ) -> Dict[str, list[str]]:
        if not isinstance(groups, dict):
            return {}

        allowed = set(allowed_tickers or [])
        normalized: Dict[str, list[str]] = {}
        seen_names: set[str] = set()

        for raw_name, raw_tickers in groups.items():
            name = cls._normalize_group_name(raw_name)
            if not name:
                continue

            lowered = name.lower()
            if lowered in seen_names:
                continue

            if not isinstance(raw_tickers, list):
                continue
            tickers = cls._normalize_tickers(raw_tickers or [], MAX_WATCHLIST_ITEMS)
            if allowed:
                tickers = [ticker for ticker in tickers if ticker in allowed]
            if not tickers:
                continue

            normalized[name] = tickers
            seen_names.add(lowered)
            if len(normalized) >= MAX_WATCHLIST_GROUPS:
                break

        return normalized

    @field_validator("watchlist")
    @classmethod
    def validate_watchlist(cls, value: list[str]) -> list[str]:
        return cls._normalize_tickers(value, MAX_WATCHLIST_ITEMS)

    @field_validator("recent_tickers")
    @classmethod
    def validate_recent(cls, value: list[str]) -> list[str]:
        return cls._normalize_tickers(value, MAX_RECENT_ITEMS)

    @field_validator("watchlist_groups")
    @classmethod
    def validate_groups(cls, value: Dict[str, list[str]] | None) -> Dict[str, list[str]] | None:
        if value is None:
            return None
        return cls._normalize_groups(value)


class WatchlistResponse(BaseModel):
    watchlist: list[str]
    recent_tickers: list[str]
    watchlist_groups: Dict[str, list[str]] = Field(default_factory=dict)
    updated_at: str


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
        is_admin=is_admin_user(user),
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
    user["is_admin"] = is_admin_user(user)
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


@auth_router.get("/watchlist", response_model=WatchlistResponse)
@limiter.limit("120/minute")
async def get_watchlist(request: Request, token: str = Depends(oauth2_scheme)) -> WatchlistResponse:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_email = payload.get("sub")
    user = db.users.find_one(
        {"email": user_email},
        {"_id": 0, "watchlist": 1, "recent_tickers": 1, "watchlist_groups": 1, "watchlist_updated_at": 1},
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    watchlist = WatchlistUpdateRequest._normalize_tickers(user.get("watchlist") or [], MAX_WATCHLIST_ITEMS)
    recent_tickers = WatchlistUpdateRequest._normalize_tickers(user.get("recent_tickers") or [], MAX_RECENT_ITEMS)
    watchlist_groups = WatchlistUpdateRequest._normalize_groups(user.get("watchlist_groups") or {}, watchlist)
    updated_at_raw = user.get("watchlist_updated_at")
    if isinstance(updated_at_raw, datetime):
        if updated_at_raw.tzinfo is None:
            updated_at_raw = updated_at_raw.replace(tzinfo=timezone.utc)
        updated_at = updated_at_raw.isoformat()
    else:
        updated_at = datetime.now(timezone.utc).isoformat()

    return WatchlistResponse(
        watchlist=watchlist,
        recent_tickers=recent_tickers,
        watchlist_groups=watchlist_groups,
        updated_at=updated_at,
    )


@auth_router.put("/watchlist", response_model=WatchlistResponse)
@limiter.limit("60/minute")
async def update_watchlist(
    request: Request,
    watchlist_update: WatchlistUpdateRequest,
    token: str = Depends(oauth2_scheme),
) -> WatchlistResponse:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_email = payload.get("sub")
    user = db.users.find_one({"email": user_email}, {"_id": 1, "watchlist_groups": 1})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if watchlist_update.watchlist_groups is None:
        watchlist_groups = WatchlistUpdateRequest._normalize_groups(
            user.get("watchlist_groups") or {},
            watchlist_update.watchlist,
        )
    else:
        watchlist_groups = WatchlistUpdateRequest._normalize_groups(
            watchlist_update.watchlist_groups,
            watchlist_update.watchlist,
        )

    now = datetime.now(timezone.utc)
    db.users.update_one(
        {"email": user_email},
        {
            "$set": {
                "watchlist": watchlist_update.watchlist,
                "recent_tickers": watchlist_update.recent_tickers,
                "watchlist_groups": watchlist_groups,
                "watchlist_updated_at": now,
                "updated_at": now,
            }
        },
    )

    return WatchlistResponse(
        watchlist=watchlist_update.watchlist,
        recent_tickers=watchlist_update.recent_tickers,
        watchlist_groups=watchlist_groups,
        updated_at=now.isoformat(),
    )
