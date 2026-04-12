from sqlalchemy import String, Column, Integer, DateTime, ForeignKey, Float
from connect_db import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True)
    pass_hash = Column(String, nullable=False)
    wallet_address = Column(String(42), nullable=False)

class Transaction(Base):
    __tablename__ = "transaction"

    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.user_id"))
    receiver_id = Column(Integer, ForeignKey("users.user_id"))
    amount = Column(Float, nullable=False)
    time = Column(DateTime, nullable=False)

