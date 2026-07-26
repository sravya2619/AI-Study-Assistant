from datetime import datetime, timedelta, timezone
import os

import jwt
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


# ============================================================
# JWT SETTINGS
# ============================================================

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set")

ALGORITHM = "HS256"


# ============================================================
# PASSWORD HASHING
# ============================================================

password_hash = PasswordHash.recommended()


# ============================================================
# BEARER AUTHENTICATION
# ============================================================

security = HTTPBearer()


# ============================================================
# TEMPORARY USER STORAGE
# ============================================================

users = {}


# ============================================================
# HASH PASSWORD
# ============================================================

def hash_password(password: str):

    return password_hash.hash(
        password
    )


# ============================================================
# VERIFY PASSWORD
# ============================================================

def verify_password(
    password: str,
    hashed_password: str
):

    return password_hash.verify(
        password,
        hashed_password
    )


# ============================================================
# CREATE JWT TOKEN
# ============================================================

def create_access_token(
    username: str
):

    expire = (
        datetime.now(timezone.utc)
        + timedelta(hours=2)
    )

    payload = {
        "sub": username,
        "exp": expire
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ============================================================
# GET CURRENT USER
# ============================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    )
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get(
            "sub"
        )

        if username is None:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        return username

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )