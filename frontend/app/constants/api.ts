/**
 * Base URL for the JustinPay FastAPI backend.
 *
 * All frontend fetch calls use this constant so there's a single place to
 * update when the server IP changes. The backend runs on port 8000 and is
 * reached over the local network during development.
 *
 * Key endpoints:
 *   POST /register          — create account
 *   POST /login             — returns JWT access token
 *   GET  /me                — current user info
 *   GET  /wallet            — wallet address + live ETH balance (via Infura)
 *   GET  /wallet/tx-params  — unsigned tx params for client-side signing
 *   POST /send-crypto       — broadcast a pre-signed transaction
 *   GET  /transactions/history — last 5 sent/received transactions
 *   POST /logout            — blacklist the current token
 */
export const API = 'http://10.188.251.69:8000';
