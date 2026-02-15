from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from database.database import user_db as db
from models.users import User, UpdateUser, MessageResponse, TokenResponse
from services.auth_services import hash_password, verify_password, create_access_token, decode_access_token, decode_access_google_token

auth_router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


@auth_router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: User) -> MessageResponse:
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
async def login(
    username: str = Form(...),
    password: Optional[str] = Form(None),
    login_type: str = Form("normal"),
    token: str = Form("token")
) -> TokenResponse:
    """Authenticate user and return access token."""
    user = db.users.find_one({"email": username})

    if login_type == "normal":
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

    access_token = create_access_token(data={"sub": user["email"]})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        email=user["email"],
        requires_password=not bool(user.get("hashed_password")),
    )


@auth_router.get("/me", response_model=Dict[str, Any])
async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
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
async def update_user_info(update_info: UpdateUser, token: str = Depends(oauth2_scheme)) -> MessageResponse:
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
