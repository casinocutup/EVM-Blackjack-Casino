/**
 * Provably Fair utilities for deterministic card shuffling
 * Uses server seed + client seed + nonce → HMAC-SHA256 → Fisher-Yates shuffle
 */

import crypto from 'crypto';

export interface ShuffleParams {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

/**
 * Generate a deterministic random number from seeds using HMAC-SHA256
 */
function generateRandomNumber(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  index: number
): number {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}:${index}`);
  const hash = hmac.digest('hex');
  
  // Convert first 8 bytes of hash to a number between 0 and 1
  const num = parseInt(hash.substring(0, 16), 16);
  return num / 0xffffffffffffffff;
}

/**
 * Fisher-Yates shuffle with deterministic randomness
 */
function fisherYatesShuffle<T>(array: T[], randomFn: (index: number) => number): T[] {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn(i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Create a standard 52-card deck
 */
export function createDeck(): Array<{ suit: string; rank: string }> {
  const suits: string[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const deck: Array<{ suit: string; rank: string }> = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  
  return deck;
}

/**
 * Shuffle deck deterministically using provably fair seeds
 */
export function shuffleDeck(params: ShuffleParams): Array<{ suit: string; rank: string }> {
  const deck = createDeck();
  
  const randomFn = (index: number) => 
    generateRandomNumber(params.serverSeed, params.clientSeed, params.nonce, index);
  
  return fisherYatesShuffle(deck, randomFn);
}

/**
 * Hash server seed for pre-commit (SHA-256)
 */
export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Verify that a server seed hash matches the revealed seed
 */
export function verifyServerSeed(serverSeed: string, serverSeedHash: string): boolean {
  return hashServerSeed(serverSeed) === serverSeedHash;
}

/**
 * Generate a random server seed (32 bytes, hex encoded)
 */
export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}
