# JustinPay 💸

A FinTech mobile application for sending and receiving Ethereum (ETH) cryptocurrency payments. JustinPay combines a React Native mobile frontend with a Python REST API backend to deliver a seamless crypto wallet experience — including NFC-based tap-to-pay functionality.

---
### Problem
If someone wants to trade crypto with someone they either have to type in a full address or scan a QR code (42 characters huge)

## How Do We Solve This?
Both users open the app
Tap phones
Done!

Crypto payments between people require manually copying 42-character wallet addresses — a process that is slow, error-prone, and completely impractical for in-person transactions. TapChain solves this by using NFC to instantly and securely exchange wallet addresses between devices, making crypto transfers as seamless as a fist bump

How it works:
  NFC is primary method
  QR is automatic fallback for iOS or distance issues

### Flow:
-  B opens "Receive" screen
-	 Screen shows button to enable NFC
-  A opens send screen
-  A types in amount
-  Tap phone (NFC)  — Android to Android
-  DONE!
## Features

- **User Authentication** — Register, login, and logout with JWT-based access/refresh token flow and secure password hashing (Argon2)
- **ETH Wallet** — View your Ethereum wallet address and live on-chain balance
- **Send Crypto** — Send ETH to other registered users; transactions are signed on the client and broadcast to the Ethereum mainnet via Web3
- **NFC Payments** — Tap-to-pay support using the device's NFC chip
- **QR Code Support** — Share your wallet address via QR code
- **Transaction History** — View a full log of sent and received transactions
- **Token Blacklisting** — Invalidated tokens are tracked server-side to ensure secure logout

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **SQLAlchemy** | ORM / database models |
| **PostgreSQL** (psycopg) | Relational database |
| **Web3.py** | Ethereum mainnet integration |
| **PyJWT** | JWT access & refresh tokens |
| **Argon2-cffi** | Password hashing |
| **Pydantic** | Request/response validation |

### Frontend
| Technology | Purpose |
|---|---|
| **React Native** (Expo) | Cross-platform mobile app (iOS & Android) |
| **TypeScript** | Type-safe JavaScript |
| **Expo Router** | File-based navigation |
| **ethers.js** | Client-side transaction signing |
| **react-native-nfc-manager** | NFC tap-to-pay |
| **react-native-qrcode-svg** | QR code generation |
| **react-native-keychain** | Secure token storage |
| **Redux** (store) | State management |

---

## Project Structure


---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/register` | Create a new user account | No |
| `POST` | `/login` | Login and receive JWT tokens | No |
| `POST` | `/logout` | Invalidate the current token | Yes |
| `POST` | `/refresh` | Get a new access token | Yes |
| `GET` | `/wallet` | Get wallet address and ETH balance | Yes |
| `GET` | `/wallet/tx-params` | Fetch transaction parameters for signing | Yes |
| `POST` | `/send-crypto` | Broadcast a signed ETH transaction | Yes |
| `GET` | `/transactions/history` | Retrieve transaction history | Yes |

---

## Getting Started

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables (create a .env file)
# DB_URL, SECRET_KEY, INFURA_API_KEY, ALGORITHM.

# Run the API server
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend/app

# Install dependencies
npm install

# Start the Expo dev server
npm start

# Run on a specific platform
npm run android
npm run ios
```

---

## Data Models

- **User** — Stores username, hashed password, and linked Ethereum wallet address
- **Transaction** — Records sender, receiver, ETH amount, timestamp, status, and on-chain transaction hash
- **Blacklist** — Tracks invalidated JWT tokens to enforce secure logout

---
