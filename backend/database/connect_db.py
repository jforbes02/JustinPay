from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase
from fastapi import Depends
from sqlalchemy import create_engine
from typing import Annotated
from dotenv import load_dotenv
import os
load_dotenv()

DB_URL = os.getenv("DB_URL")

engine = create_engine(DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) #each sessions work has to be commited through session.commit()

class Base(DeclarativeBase):
    """DEFINES MODELS PYTHONICALLY (ORM)"""
    pass


def get_db():
    db = SessionLocal() #open connection
    try:
        yield db # pauses and gives connection to caller of function
    finally:
        db.close() #prevent connection leak

#dependency injection for functioning that need session data
curr_session = Annotated[Session, Depends(get_db)]

