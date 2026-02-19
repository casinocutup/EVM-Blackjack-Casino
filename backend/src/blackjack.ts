/**
 * Blackjack game logic
 */

import type { Card, Hand, GameState } from '@evm-blackjack/shared';
import { shuffleDeck, type ShuffleParams } from '@evm-blackjack/shared';

/**
 * Calculate hand value (best possible blackjack value)
 */
export function calculateHandValue(cards: Card[]): { value: number; isSoft: boolean; isBusted: boolean } {
  let value = 0;
  let aces = 0;
  let isSoft = false;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }

  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  isSoft = aces > 0 && value <= 21;
  const isBusted = value > 21;

  return { value, isSoft, isBusted };
}

/**
 * Create a hand from cards
 */
export function createHand(cards: Card[]): Hand {
  const { value, isSoft, isBusted } = calculateHandValue(cards);
  const isBlackjack = cards.length === 2 && value === 21;

  return {
    cards,
    value,
    isBlackjack,
    isBusted,
    isSoft,
  };
}

/**
 * Deal initial cards from shuffled deck
 */
export function dealInitialCards(shuffledDeck: Array<{ suit: string; rank: string }>): {
  playerCards: Card[];
  dealerCards: Card[];
  remainingDeck: Array<{ suit: string; rank: string }>;
} {
  const playerCards: Card[] = [
    mapCard(shuffledDeck[0]),
    mapCard(shuffledDeck[1]),
  ];
  
  const dealerCards: Card[] = [
    mapCard(shuffledDeck[2]),
    mapCard(shuffledDeck[3]),
  ];

  return {
    playerCards,
    dealerCards,
    remainingDeck: shuffledDeck.slice(4),
  };
}

/**
 * Map deck card to Card type with value
 */
function mapCard(card: { suit: string; rank: string }): Card {
  let value: number;
  if (card.rank === 'A') {
    value = 11; // Will be adjusted in hand calculation
  } else if (['J', 'Q', 'K'].includes(card.rank)) {
    value = 10;
  } else {
    value = parseInt(card.rank);
  }

  return {
    suit: card.suit as Card['suit'],
    rank: card.rank as Card['rank'],
    value,
  };
}

/**
 * Deal a card from remaining deck
 */
export function dealCard(remainingDeck: Array<{ suit: string; rank: string }>): {
  card: Card;
  newDeck: Array<{ suit: string; rank: string }>;
} {
  const card = mapCard(remainingDeck[0]);
  return {
    card,
    newDeck: remainingDeck.slice(1),
  };
}

/**
 * Check if hand can be split (two cards of same rank)
 */
export function canSplit(hand: Hand): boolean {
  return hand.cards.length === 2 && 
         getCardRankValue(hand.cards[0].rank) === getCardRankValue(hand.cards[1].rank);
}

/**
 * Get numeric value for rank (for split comparison)
 */
function getCardRankValue(rank: string): number {
  if (rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank);
}

/**
 * Check if insurance is available (dealer shows Ace)
 */
export function canInsurance(dealerUpCard: Card): boolean {
  return dealerUpCard.rank === 'A';
}

/**
 * Dealer must hit on soft 17 (some rules, we'll use standard: hit on 16, stand on 17+)
 */
export function dealerShouldHit(dealerHand: Hand): boolean {
  return dealerHand.value < 17;
}

/**
 * Calculate payout for blackjack outcome
 * - Blackjack: 3:2 (1.5x bet)
 * - Regular win: 1:1 (1x bet)
 * - Insurance win: 2:1 (2x insurance bet)
 * - Push: 0 (return bet)
 */
export function calculatePayout(
  betAmount: string,
  outcome: 'player-win' | 'dealer-win' | 'push' | 'blackjack',
  isBlackjack: boolean,
  insuranceBet?: string
): string {
  const bet = BigInt(betAmount);
  
  if (outcome === 'push') {
    return betAmount; // Return bet
  }
  
  if (outcome === 'dealer-win') {
    return '0'; // Lose bet
  }
  
  if (isBlackjack && outcome === 'blackjack') {
    // Blackjack pays 3:2
    return (bet * BigInt(3) / BigInt(2)).toString();
  }
  
  if (outcome === 'player-win') {
    // Regular win pays 1:1
    return (bet * BigInt(2)).toString();
  }
  
  return '0';
}

/**
 * Calculate insurance payout (2:1)
 */
export function calculateInsurancePayout(insuranceBet: string): string {
  const bet = BigInt(insuranceBet);
  return (bet * BigInt(3)).toString(); // 2:1 means you get 3x back (bet + 2x)
}

/**
 * Determine game outcome
 */
export function determineOutcome(
  playerHand: Hand,
  dealerHand: Hand,
  isInsuranceWin?: boolean
): 'player-win' | 'dealer-win' | 'push' | 'blackjack' {
  // Insurance is handled separately
  if (isInsuranceWin) {
    // Insurance doesn't affect main game outcome
  }

  // Player blackjack beats dealer blackjack (usually)
  if (playerHand.isBlackjack && !dealerHand.isBlackjack) {
    return 'blackjack';
  }

  if (dealerHand.isBlackjack && !playerHand.isBlackjack) {
    return 'dealer-win';
  }

  if (playerHand.isBusted) {
    return 'dealer-win';
  }

  if (dealerHand.isBusted) {
    return 'player-win';
  }

  if (playerHand.value > dealerHand.value) {
    return 'player-win';
  }

  if (playerHand.value < dealerHand.value) {
    return 'dealer-win';
  }

  return 'push';
}

/**
 * Create shuffled deck from provably fair seeds
 */
export function createShuffledDeck(params: ShuffleParams): Array<{ suit: string; rank: string }> {
  return shuffleDeck(params);
}
