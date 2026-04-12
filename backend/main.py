from os import name

from fastapi import FastAPI
from backend.database.connect_db import Base, engine

Base.metadata.create_all(bind=engine)
app = FastAPI(title="JustinPay!", description="FinTech NFC payment wallet", version="0.0.1")


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
