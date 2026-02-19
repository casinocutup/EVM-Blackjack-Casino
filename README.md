# EVM Blackjack Casino – Provably Fair Blackjack with Web3 Wallet Payments (No Smart Contracts)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

A production-ready, full-stack web application for a provably fair Blackjack casino game. Features centralized game logic with cryptographic provable fairness and Web3 wallet integration (MetaMask/WalletConnect) for EVM-based deposits, bets, and payouts. No smart contracts required – all game logic runs off-chain with transparent, verifiable randomness.

## 🎲 Features

- **Provably Fair**: Cryptographic seed-based system (server seed hash pre-commit + client seed + nonce) using HMAC-SHA256 for deterministic card shuffling
- **Web3 Wallet Integration**: Seamless MetaMask and WalletConnect support via wagmi/viem
- **Multi-Chain Support**: Ethereum, Base, Arbitrum, Polygon (configurable)
- **Classic Blackjack Rules**: Hit, Stand, Double, Split, Insurance with proper payout calculations (3:2 blackjack, 1:1 win, 2:1 insurance)
- **Real-Time Balance Tracking**: Off-chain balance management with on-chain deposit confirmations
- **Transaction Transparency**: All deposits and payouts tracked with transaction hashes
- **Beautiful UI**: Dark casino theme with Framer Motion animations, card flips, confetti on wins
- **Verification Tool**: Built-in provably fair verification component to recompute and verify any hand
- **Responsive Design**: Works on desktop and mobile devices

## 🛠 Tech Stack

### Backend
- **Node.js** + **Express** + **TypeScript**
- **SQLite** database (easily swappable to PostgreSQL/MySQL)
- **ethers.js** for EVM transaction verification
- **JWT** for wallet-based authentication
- **Rate limiting** and security middleware

### Frontend
- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Framer Motion** for animations
- **wagmi** + **viem** for Web3 wallet integration
- **React Query** for data fetching
- **React Hot Toast** for notifications

### Provably Fair
- **HMAC-SHA256** for deterministic randomness
- **Fisher-Yates shuffle** with cryptographic seed
- **Server seed pre-commit** (hash shown before hand)
- **Client seed** (user-provided or auto-generated)
- **Nonce** for uniqueness

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn
- **MetaMask** or compatible Web3 wallet
- **EVM-compatible network** (Ethereum, Base, Arbitrum, or Polygon)
- Basic knowledge of Web3 wallets and EVM transactions

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd EVM-Blackjack-Casino-1
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

This will install dependencies for:
- Root workspace
- Backend (`backend/`)
- Frontend (`frontend/`)
- Shared (`shared/`)

### 3. Configure Environment Variables

Create `.env` files in the root and backend directories:

**Root `.env`** (optional, for frontend):
```env
VITE_API_URL=http://localhost:3001/api
VITE_HOUSE_WALLET=0xYourHouseWalletAddress
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

**Backend `.env`**:
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# House wallet that receives deposits
HOUSE_WALLET_ADDRESS=0xYourHouseWalletAddress

# Supported chains (comma-separated)
SUPPORTED_CHAINS=1,8453,42161,137
DEFAULT_CHAIN_ID=1

# RPC URLs for transaction polling
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Transaction polling
TX_POLL_INTERVAL_MS=5000
TX_CONFIRMATION_BLOCKS=3

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Database
DB_PATH=./data/casino.db
```

### 4. Build Shared Package

```bash
cd shared
npm run build
cd ..
```

### 5. Start Development Servers

**Option A: Run both simultaneously**
```bash
npm run dev
```

**Option B: Run separately**
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

The backend will run on `http://localhost:3001` and the frontend on `http://localhost:5173`.

## 🎮 How to Play

### 1. Connect Wallet
- Click "Connect Wallet" and select MetaMask or WalletConnect
- Sign the authentication message to verify wallet ownership
- Your wallet address is now linked to your account

### 2. Deposit Funds
- Click "Deposit" button
- Enter amount in ETH
- Send transaction to the house wallet address (shown with QR code)
- Wait for confirmations (typically 3 blocks)
- Balance updates automatically

### 3. Play Blackjack
- Set your bet amount (minimum 0.01 ETH)
- Optionally set a client seed (or use random)
- Click "Deal Cards"
- Server seed hash is shown (pre-commit for provable fairness)
- Make decisions: Hit, Stand, Double, Split, or Insurance
- Dealer plays automatically
- Win/loss determined and balance updated

### 4. Verify Fairness
- Click "Verify" button
- Enter server seed hash, revealed server seed, client seed, and nonce
- Click "Verify" to recompute the shuffle
- Compare results with actual cards dealt

### 5. Withdraw Winnings
- Click "Withdraw" button
- Enter amount and destination address
- Submit withdrawal request
- Admin processes manually (in production, automate with scripts)

## 📧 Support

- Telegram: https://t.me/CasinoCutup
- Twitter: https://x.com/CasinoCutup
