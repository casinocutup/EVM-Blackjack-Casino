/**
 * Shared types for EVM Blackjack Casino
 */

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  value: number; // For blackjack: A=1 or 11, face cards=10
}

export interface Hand {
  cards: Card[];
  value: number; // Best blackjack value
  isBlackjack: boolean;
  isBusted: boolean;
  isSoft: boolean; // Contains ace counted as 11
}

export interface GameState {
  id: string;
  playerAddress: string;
  betAmount: string; // Wei amount as string
  playerHand: Hand;
  dealerHand: Hand;
  dealerHiddenCard?: Card;
  status: 'betting' | 'playing' | 'dealer-turn' | 'resolved' | 'cancelled';
  outcome?: 'player-win' | 'dealer-win' | 'push' | 'blackjack';
  payout?: string; // Wei amount as string
  canDouble: boolean;
  canSplit: boolean;
  canInsurance: boolean;
  insuranceBet?: string;
  splitHands?: Hand[];
  currentHandIndex?: number; // For split hands
}

export interface ProvablyFairData {
  serverSeedHash: string; // SHA-256 hash of server seed (pre-commit)
  serverSeed?: string; // Revealed after hand resolution
  clientSeed: string;
  nonce: number;
  cards: Card[];
  verified: boolean;
}

export interface HandRecord {
  id: string;
  playerAddress: string;
  betAmount: string;
  payout: string;
  outcome: string;
  provablyFair: ProvablyFairData;
  depositTxHash?: string;
  payoutTxHash?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface User {
  address: string;
  balance: string; // Wei amount as string
  pendingDeposits: PendingDeposit[];
  createdAt: string;
  lastActiveAt: string;
}

export interface PendingDeposit {
  txHash: string;
  amount: string;
  tokenAddress?: string; // undefined for ETH, address for ERC20
  chainId: number;
  blockNumber?: number;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  playerAddress: string;
  amount: string;
  toAddress: string;
  tokenAddress?: string;
  chainId: number;
  status: 'pending' | 'approved' | 'sent' | 'failed';
  txHash?: string;
  createdAt: string;
  processedAt?: string;
}

export interface WalletAuth {
  address: string;
  message: string;
  signature: string;
  chainId: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
