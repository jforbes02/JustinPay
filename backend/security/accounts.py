from datetime import timedelta

from fastapi import HTTPException
from pydantic import BaseModel

from backend.database.connect_db import curr_session
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from backend.database.models import User, Blacklist
from backend.security.JWT import create_refresh_token, create_access_token

#chose argon2 hashing as it is more secure and robust
#password hashing
ph = PasswordHasher()

def verify_password(hashed: str, plain: str):
    """Verifies if the password matches the hashed password (used for login)"""
    try:
        return ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False

def get_password_hash(password: str) -> str:
    """Generates the password hash (used for registration)"""
    return ph.hash(password)

class CreateUser(BaseModel):
    username: str
    wallet_address: str

class RegisterReq(BaseModel):
    """Form data for a registration request"""
    username: str
    password: str
    wallet_address: str

def valid_wal(wallet: str) -> bool:
    """check if wallet address is valid"""
    if not wallet.startswith("0x") or len(wallet) != 42: #make sure len(wallet address) == 42
        raise HTTPException(status_code=400, detail="Invalid ETH address")
    else:
        return True

def existing_wallet(db:curr_session, wallet: str, username: str) -> bool:
    """check if attempted registration already exists in db"""
    existing = db.query(User).filter(User.wallet_address == wallet).first()
    if existing:
        raise HTTPException(status_code=409, detail="Wallet addres already taken")
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists cannot register")
    return True


def register_user(db: curr_session, username: str, password: str, wallet: str):
    """Registers a new user"""
    valid_wal(wallet)
    existing_wallet(db=db, wallet=wallet, username=username)
    #hash password
    argon_pass = get_password_hash(password)
    #create new user instance with hashed password
    user = User(username=username, pass_hash=argon_pass, wallet_address=wallet)

    #insert the data into the database
    db.add(user)
    db.commit()
    db.refresh(user)

    #return Username and Public Wallet Address of user
    return CreateUser(username=username, wallet_address=wallet)


class LoginReq(BaseModel):
    username: str
    password: str




def login_user(db: curr_session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(user.pass_hash, password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token(username=username, user_id=user.user_id, expires_delta=timedelta(minutes=30))
    refresh = create_refresh_token(username=username, user_id=user.user_id, expires_delta=timedelta(days=30))

    return {"access_token": access, "refresh": refresh, "token_type": "bearer"}

def logout_user(token: str, db: curr_session):
    blacklisted = Blacklist(token=token)
    db.add(blacklisted)
    db.commit()
    return {"message": "You have been logged out"}

