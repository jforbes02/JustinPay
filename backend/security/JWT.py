from datetime import timedelta, datetime, timezone
from typing import Annotated

from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer

import jwt
import os
import dotenv
from pydantic import BaseModel

from backend.database.connect_db import curr_session
from backend.database.models import Blacklist

dotenv.load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALG = os.getenv("ALGORITHM") #token signing algorithm

oauth2_bearer = OAuth2PasswordBearer(tokenUrl="token") #Using Oauth2 to handle tokens from /token endpoint


#JWT Tokens
class TokenResponse(BaseModel):
    """Token response after a login"""
    access_token: str
    refresh: str
    token_type: str

def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    """
    Creates JWT token that contains User info, expires after a specific time delta
    """
    encode = {
        "sub": username,
        "id": str(user_id),
        "exp": datetime.now(timezone.utc) + expires_delta,
        "type": "access"
    }

    return jwt.encode(encode, SECRET_KEY, algorithm=ALG) #returns signed jwt

def create_refresh_token(username: str, user_id: int, expires_delta: timedelta) -> str:
    """
    Creates refresh JWT token with longer expiration for token renewal
    """
    encode = {
        'sub': username,
        'id': str(user_id),
        "exp": datetime.now(timezone.utc) + expires_delta,
        'type': 'refresh', #token type for validation
    }
    return jwt.encode(encode, SECRET_KEY, algorithm=ALG)

def verify_token(token: str, db: curr_session) -> dict:
    """Takes a JWT token and verifies if the token is valid (guards payment/transaction routes)"""
    blacklisted = db.query(Blacklist).filter(Blacklist.token == token).first()
    if blacklisted:
        raise HTTPException(status_code=401, detail="Token revoked")
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALG])
        return decoded #username, user_id, exp, type
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_refresh_token(token: str) -> dict:
    """Takes a refresh token and verifies if the token is valid (guards the token renewal route)"""
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALG])

        token_type = decoded.get("type")
        if token_type != "refresh":
            raise HTTPException(status_code=401, detail='Invalid token type')

        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(token: Annotated[str, Depends(oauth2_bearer)], db: curr_session): #extracts token from request header
    return verify_token(token, db)

currentUser = Annotated[dict, Depends(get_current_user)]

