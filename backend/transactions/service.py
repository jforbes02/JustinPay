from datetime import datetime
from fastapi import HTTPException
from decimal import Decimal
import dotenv
from pydantic import BaseModel
from web3 import AsyncWeb3
import os
import time
import httpx
from backend.database.connect_db import curr_session
from backend.database.models import User, Transaction
dotenv.load_dotenv()

_eth_price_cache: dict = {"price": None, "ts": 0.0}
PRICE_TTL = 60  # seconds

INFURA_KEY = os.getenv("INFURA_API_KEY")
w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(
    f'https://mainnet.infura.io/v3/{INFURA_KEY}'
))


class SendCryptoRequest(BaseModel):
    receiver_id: int
    amount: float
    signed_tx: str

class TxParams(BaseModel):
    nonce: int
    gas_price: int
    gas_limit: int
    chain_id: int
    value_wei: int

async def get_tx_params(from_address: str, to_address: str, amount: float) -> TxParams:
    """Builds unsigned transaction parameters for the client to sign locally."""
    if not await w3.is_connected():
        raise HTTPException(status_code=503, detail="Connection to Blockchain failed")

    nonce = await w3.eth.get_transaction_count(w3.to_checksum_address(from_address))
    gas_price = await w3.eth.gas_price
    chain_id = await w3.eth.chain_id
    value_wei = w3.to_wei(amount, "ether")

    gas_limit = await w3.eth.estimate_gas({
        "from": w3.to_checksum_address(from_address),
        "to": w3.to_checksum_address(to_address),
        "value": value_wei,
    })

    return TxParams(
        nonce=nonce,
        gas_price=gas_price,
        gas_limit=gas_limit,
        chain_id=chain_id,
        value_wei=value_wei,
    )

async def get_eth_price_usd() -> float:
    """Fetches live ETH/USD price from CoinGecko, cached for 60s."""
    now = time.monotonic()
    if _eth_price_cache["price"] is not None and now - _eth_price_cache["ts"] < PRICE_TTL:
        return _eth_price_cache["price"]
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "ethereum", "vs_currencies": "usd"},
            timeout=10,
        )
        resp.raise_for_status()
        price = float(resp.json()["ethereum"]["usd"])
    _eth_price_cache["price"] = price
    _eth_price_cache["ts"] = now
    return price

def usd_to_wei(usd: float, eth_price_usd: float) -> int:
    eth_amount = Decimal(str(usd)) / Decimal(str(eth_price_usd))
    wei = int(eth_amount * Decimal('1e18'))
    return wei

async def get_balance(address: str, eth_price: float | None = None) -> dict:
    """Gets wallet balance in both ETH and USD."""
    wei_bal = await w3.eth.get_balance(address)
    balance_eth = float(w3.from_wei(wei_bal, "ether"))
    if eth_price is None:
        eth_price = await get_eth_price_usd()
    return {"eth": balance_eth, "usd": balance_eth * eth_price}

async def send_crypto(db: curr_session, send_id: int, receiver_id: int, amount: float, signed_tx: str) -> dict:
    """Checks Blockchain connection, checks senders balance, and then starts the transaction from already_signed transaction from client side then log it in db"""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if send_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot send to yourself")

    #connecting to blockchain
    if not await w3.is_connected():
        raise HTTPException(status_code=503, detail="Connection to Blockchain failed")

    # $1 USD minimum
    eth_price = await get_eth_price_usd()
    amount_usd = amount * eth_price
    if amount_usd < 1.00:
        raise HTTPException(status_code=400, detail=f"Minimum send is $1.00 USD (you sent ${amount_usd:.4f})")

    #Checking for user's in db
    sender = db.query(User).filter(User.user_id == send_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found in db")

    receiver = db.query(User).filter(User.user_id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found in db")

    #Seeing how much ETH the sender has in his wallet
    my_wallet = sender.wallet_address
    balance = await get_balance(my_wallet, eth_price)

    if balance["eth"] < amount:
        raise HTTPException(status_code=400, detail="I don't have enough Eth to give")

    try:
        tx_hash = await w3.eth.send_raw_transaction(signed_tx)


        new_transaction = Transaction(
            sender_id = send_id,
            receiver_id = receiver_id,
            amount = amount,
            time = datetime.now(),
            status = "pending",
            tx_hash = tx_hash.hex()

        )

        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)

        return {
            "transaction_id": new_transaction.id,
            "tx_hash": tx_hash.hex(),
            "amount": amount,
            "status": "complete"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Transaction failed: {str(e)}")

async def trans_history(db: curr_session, user_id: int) -> list:
    """Gets the 5 most recent transactions sent or received by users and returns json record of the transactions"""
    transactions = (
        db.query(Transaction)
        .filter((Transaction.sender_id == user_id) | (Transaction.receiver_id == user_id))
        .order_by(Transaction.time.desc())
        .limit(5)
        .all()
    )
    #can use pagination in the future
    return [
        {
            "id": tx.id,
            "sender_id": tx.sender_id,
            "receiver_id": tx.receiver_id,
            "amount": tx.amount,
            "status": tx.status,
            "time": tx.time,
            "tx_hash": tx.tx_hash,
        }
        for tx in transactions
    ]