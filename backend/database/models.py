from datetime import datetime, timezone
from sqlalchemy import String, Column, Integer, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship

from backend.database.connect_db import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True)
    pass_hash = Column(String, nullable=False)
    wallet_address = Column(String(42), nullable=False, unique=True)

    # 2 users can have the same transaction in their model sent and sender
    sent_transactions = relationship("Transaction", foreign_keys="Transaction.sender_id", back_populates="sender")
    received_transactions = relationship("Transaction", foreign_keys="Transaction.receiver_id", back_populates="receiver")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.user_id"))
    receiver_id = Column(Integer, ForeignKey("users.user_id"))
    amount = Column(Float, nullable=False)
    time = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    status = Column(String, default="pending", nullable=False)
    tx_hash = Column(String, nullable=True, unique=True) #receipt

    sender = relationship("User", foreign_keys="Transaction.sender_id", back_populates="sent_transactions")
    receiver = relationship("User", foreign_keys="Transaction.receiver_id", back_populates="received_transactions")


class Blacklist(Base):
    __tablename__ = "blacklist"

    id = Column(Integer, primary_key=True)
    token = Column(String, nullable=False, unique=True)
    blacklisted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))