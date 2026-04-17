from datetime import timedelta
from typing import Annotated

from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordRequestForm

from backend.database.connect_db import Base, engine, curr_session
from backend.database import models
from backend.security.JWT import currentUser, TokenResponse, verify_refresh_token, oauth2_bearer, create_access_token
from backend.security.accounts import register_user, CreateUser, RegisterReq, LoginReq, login_user, logout_user
from backend.transactions.service import send_crypto, SendCryptoRequest, get_balance

Base.metadata.create_all(bind=engine)
app = FastAPI(title="JustinPay!", description="FinTech Crypto ETH payment wallet", version="0.0.1")


@app.get("/")
async def root():
    return {"message": "Welcome!"}

@app.post("/register", response_model=CreateUser)
def register(req: RegisterReq, db: curr_session):
    return register_user(db=db, username=req.username, password=req.password, wallet=req.wallet_address)

@app.post("/login", response_model=TokenResponse) #mobile app endpoin
def login(req: LoginReq, db: curr_session):
    return login_user(db=db, username=req.username, password=req.password)

@app.get("/me") #testing
def me(user: currentUser):
    return {"username": user["sub"], "id": user["id"]}

@app.post("/token", response_model=TokenResponse) #enpoint for testing using /docs
def token(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: curr_session):
    return login_user(db=db, username=form.username, password=form.password)

@app.post("/refresh", response_model=TokenResponse)
def refresh(req: Annotated[str, Depends(oauth2_bearer)]):

    verified_refresh = verify_refresh_token(req)

    new_access = create_access_token(
        username=verified_refresh["sub"],
        user_id=verified_refresh["id"],
        expires_delta=timedelta(minutes=30)
    )

    return {"access_token": new_access, "refresh": req, "token_type": "bearer"}

@app.post("/logout")
def logout_route(req: Annotated[str, Depends(oauth2_bearer)], db: curr_session):
    return logout_user(token=req, db=db)

@app.post("/send-crypto", response_model=SendCryptoRequest)
async def send_crypto_route(req: SendCryptoRequest, db: curr_session, current_user: currentUser):
    return await send_crypto(db=db, send_id=int(current_user["id"]), receiver_id=req.receiver_id, amount=req.amount, signed_tx=req.signed_tx)

@app.get("/wallet")
async def wallet(db: curr_session, current_user: currentUser):
    user = db.query(models.User).filter(models.User.user_id == int(current_user["id"])).first()
    balance = await get_balance(user.wallet_address)

    return {"address": user.wallet_address, "balance": float(balance)}
