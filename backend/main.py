from datetime import timedelta
from typing import Annotated

from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordRequestForm

from backend.database.connect_db import Base, engine, curr_session
from backend.database import models
from backend.security.JWT import currentUser, TokenResponse, verify_refresh_token, oauth2_bearer, create_access_token
from backend.security.accounts import register_user, CreateUser, RegisterReq, LoginReq, login_user, logout_user

Base.metadata.create_all(bind=engine)
app = FastAPI(title="JustinPay!", description="FinTech NFC payment wallet", version="0.0.1")


@app.get("/")
async def root():
    return {"message": "Hello World"}

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
def logout_route(token: Annotated[str, Depends(oauth2_bearer)], db: curr_session):
    return logout_user(token=token, db=db)