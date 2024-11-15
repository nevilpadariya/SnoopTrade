# auth_router.py
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from backend.database.database import user_db as db
from backend.models.users import User, UpdateUser, MessageResponse, TokenResponse
from backend.services.auth_services import hash_password, verify_password, create_access_token, decode_access_token

auth_router = APIRouter()

# Define the token dependency for OAuth2 tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")



@auth_router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: User) -> MessageResponse:
    """
    Registers a new user.

    Parameters:
    - user: User - The user object containing name, email, and password.

    Returns:
    - A message indicating the user was created successfully.
    """
    # Check if the user already exists
    user_exists = db.users.find_one({"email": user.email})
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )


    # Hash the password
    hashed_password = hash_password(user.password)

    # Prepare the new user data
    new_user = {
        "name": user.name,
        "email": user.email,
        "hashed_password": hashed_password,
    }

    # Insert the user into the database
    db.users.insert_one(new_user)
    return MessageResponse(message="User created successfully")


@auth_router.post("/token", response_model=TokenResponse)
async def login(
    username: str = Form(...),
    password: Optional[str] = Form(None),
    login_type: str = Form("normal")  # Default to "normal" if not provided
) -> TokenResponse:
    """
    Authenticates a user and generates an access token.

    Parameters:
    - username: str - The user's email.
    - password: Optional[str] - The user's password (ignored for Google login).
    - login_type: str - Type of login ("normal" or "google").

    Returns:
    - A token response containing the access token, token type, and user's email.
    """
    # Check if the user exists in the database
    user = db.users.find_one({"email": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found, Please sign up to access our services"
        )

    # Verify password if login type is "normal"
    if login_type == "normal":
        if not password or not verify_password(password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )
    elif login_type == "google":
        # Skip password verification for Google login
        print("Google login detected, skipping password check")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid login type"
        )

    # Create access token
    access_token = create_access_token(data={"sub": user["email"]})

    # Return access token with user's email
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        email=user["email"]
    )


@auth_router.get("/me", response_model=Dict[str, Any])
async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    Retrieves the current user's information.

    Parameters:
    - token: str - The user's access token.

    Returns:
    - A dictionary containing user data (excluding the password).
    """
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Find user by email and exclude hashed_password
    user = db.users.find_one({"email": payload.get("sub")}, {"hashed_password": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Remove the _id field if it exists
    user.pop("_id", None)

    # Return user data
    return user


@auth_router.put("/me/update", response_model=MessageResponse)
async def update_user_info(update_info: UpdateUser, token: str = Depends(oauth2_scheme)) -> MessageResponse:
    """
    Updates the current user's information.

    Parameters:
    - update_info: UpdateUser - The information to update (name and/or password).
    - token: str - The user's access token.

    Returns:
    - A message indicating the user information was updated successfully.
    """
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
        update_data["hashed_password"] = hash_password(update_info.password)  # Hash the new password

    if update_data:
        db.users.update_one({"email": user_email}, {"$set": update_data})

    return MessageResponse(message="User information updated successfully")
