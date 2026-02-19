/**
 * Database setup and utilities using SQLite
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { User, HandRecord, PendingDeposit, WithdrawalRequest } from '@evm-blackjack/shared';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/casino.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better concurrency

/**
 * Initialize database tables
 */
export function initDatabase(): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      address TEXT PRIMARY KEY,
      balance TEXT NOT NULL DEFAULT '0',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Pending deposits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_deposits (
      tx_hash TEXT PRIMARY KEY,
      player_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      token_address TEXT,
      chain_id INTEGER NOT NULL,
      block_number INTEGER,
      confirmations INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_address) REFERENCES users(address)
    )
  `);

  // Hand records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hand_records (
      id TEXT PRIMARY KEY,
      player_address TEXT NOT NULL,
      bet_amount TEXT NOT NULL,
      payout TEXT NOT NULL,
      outcome TEXT NOT NULL,
      server_seed_hash TEXT NOT NULL,
      server_seed TEXT,
      client_seed TEXT NOT NULL,
      nonce INTEGER NOT NULL,
      cards TEXT NOT NULL,
      deposit_tx_hash TEXT,
      payout_tx_hash TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY (player_address) REFERENCES users(address)
    )
  `);

  // Withdrawal requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      player_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      to_address TEXT NOT NULL,
      token_address TEXT,
      chain_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      tx_hash TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      FOREIGN KEY (player_address) REFERENCES users(address)
    )
  `);

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hand_records_player ON hand_records(player_address);
    CREATE INDEX IF NOT EXISTS idx_hand_records_created ON hand_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_pending_deposits_player ON pending_deposits(player_address);
    CREATE INDEX IF NOT EXISTS idx_pending_deposits_status ON pending_deposits(status);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_player ON withdrawal_requests(player_address);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
  `);
}

/**
 * Get or create user
 */
export function getOrCreateUser(address: string): User {
  const stmt = db.prepare('SELECT * FROM users WHERE address = ?');
  let user = stmt.get(address) as any;

  if (!user) {
    const insert = db.prepare('INSERT INTO users (address, balance) VALUES (?, ?)');
    insert.run(address, '0');
    user = stmt.get(address) as any;
  } else {
    // Update last active
    const update = db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE address = ?');
    update.run(address);
  }

  return {
    address: user.address,
    balance: user.balance,
    pendingDeposits: getPendingDeposits(address),
    createdAt: user.created_at,
    lastActiveAt: user.last_active_at,
  };
}

/**
 * Update user balance
 */
export function updateUserBalance(address: string, newBalance: string): void {
  const stmt = db.prepare('UPDATE users SET balance = ?, last_active_at = CURRENT_TIMESTAMP WHERE address = ?');
  stmt.run(newBalance, address);
}

/**
 * Get user balance
 */
export function getUserBalance(address: string): string {
  const stmt = db.prepare('SELECT balance FROM users WHERE address = ?');
  const result = stmt.get(address) as any;
  return result?.balance || '0';
}

/**
 * Add pending deposit
 */
export function addPendingDeposit(deposit: Omit<PendingDeposit, 'createdAt'>): void {
  const stmt = db.prepare(`
    INSERT INTO pending_deposits 
    (tx_hash, player_address, amount, token_address, chain_id, block_number, confirmations, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    deposit.txHash,
    deposit.playerAddress,
    deposit.amount,
    deposit.tokenAddress || null,
    deposit.chainId,
    deposit.blockNumber || null,
    deposit.confirmations,
    deposit.status
  );
}

/**
 * Get pending deposits for user
 */
export function getPendingDeposits(playerAddress: string): PendingDeposit[] {
  const stmt = db.prepare('SELECT * FROM pending_deposits WHERE player_address = ? ORDER BY created_at DESC');
  const rows = stmt.all(playerAddress) as any[];
  
  return rows.map(row => ({
    txHash: row.tx_hash,
    amount: row.amount,
    tokenAddress: row.token_address,
    chainId: row.chain_id,
    blockNumber: row.block_number,
    confirmations: row.confirmations,
    status: row.status as 'pending' | 'confirmed' | 'failed',
    createdAt: row.created_at,
  }));
}

/**
 * Update deposit status
 */
export function updateDepositStatus(txHash: string, status: 'pending' | 'confirmed' | 'failed', confirmations?: number, blockNumber?: number): void {
  if (confirmations !== undefined && blockNumber !== undefined) {
    const stmt = db.prepare('UPDATE pending_deposits SET status = ?, confirmations = ?, block_number = ? WHERE tx_hash = ?');
    stmt.run(status, confirmations, blockNumber, txHash);
  } else {
    const stmt = db.prepare('UPDATE pending_deposits SET status = ? WHERE tx_hash = ?');
    stmt.run(status, txHash);
  }
}

/**
 * Save hand record
 */
export function saveHandRecord(record: Omit<HandRecord, 'createdAt' | 'resolvedAt'>): void {
  const stmt = db.prepare(`
    INSERT INTO hand_records 
    (id, player_address, bet_amount, payout, outcome, server_seed_hash, server_seed, client_seed, nonce, cards, deposit_tx_hash, payout_tx_hash, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    record.id,
    record.playerAddress,
    record.betAmount,
    record.payout,
    record.outcome,
    record.provablyFair.serverSeedHash,
    record.provablyFair.serverSeed || null,
    record.provablyFair.clientSeed,
    record.provablyFair.nonce,
    JSON.stringify(record.provablyFair.cards),
    record.depositTxHash || null,
    record.payoutTxHash || null,
    record.resolvedAt || null
  );
}

/**
 * Get hand records for user
 */
export function getHandRecords(playerAddress: string, limit: number = 50): HandRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM hand_records 
    WHERE player_address = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  const rows = stmt.all(playerAddress, limit) as any[];
  
  return rows.map(row => ({
    id: row.id,
    playerAddress: row.player_address,
    betAmount: row.bet_amount,
    payout: row.payout,
    outcome: row.outcome,
    provablyFair: {
      serverSeedHash: row.server_seed_hash,
      serverSeed: row.server_seed,
      clientSeed: row.client_seed,
      nonce: row.nonce,
      cards: JSON.parse(row.cards),
      verified: false, // Can be computed on fetch if needed
    },
    depositTxHash: row.deposit_tx_hash,
    payoutTxHash: row.payout_tx_hash,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
}

/**
 * Create withdrawal request
 */
export function createWithdrawalRequest(request: Omit<WithdrawalRequest, 'createdAt' | 'processedAt'>): void {
  const stmt = db.prepare(`
    INSERT INTO withdrawal_requests 
    (id, player_address, amount, to_address, token_address, chain_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    request.id,
    request.playerAddress,
    request.amount,
    request.toAddress,
    request.tokenAddress || null,
    request.chainId,
    request.status
  );
}

/**
 * Get withdrawal requests
 */
export function getWithdrawalRequests(playerAddress?: string): WithdrawalRequest[] {
  if (playerAddress) {
    const stmt = db.prepare('SELECT * FROM withdrawal_requests WHERE player_address = ? ORDER BY created_at DESC');
    const rows = stmt.all(playerAddress) as any[];
    return mapWithdrawalRows(rows);
  } else {
    const stmt = db.prepare('SELECT * FROM withdrawal_requests ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return mapWithdrawalRows(rows);
  }
}

function mapWithdrawalRows(rows: any[]): WithdrawalRequest[] {
  return rows.map(row => ({
    id: row.id,
    playerAddress: row.player_address,
    amount: row.amount,
    toAddress: row.to_address,
    tokenAddress: row.token_address,
    chainId: row.chain_id,
    status: row.status as 'pending' | 'approved' | 'sent' | 'failed',
    txHash: row.tx_hash,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  }));
}

/**
 * Update withdrawal request
 */
export function updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>): void {
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.status) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.txHash) {
    fields.push('tx_hash = ?');
    values.push(updates.txHash);
  }
  if (updates.processedAt) {
    fields.push('processed_at = ?');
    values.push(updates.processedAt);
  }
  
  if (fields.length > 0) {
    values.push(id);
    const stmt = db.prepare(`UPDATE withdrawal_requests SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }
}

export { db };
