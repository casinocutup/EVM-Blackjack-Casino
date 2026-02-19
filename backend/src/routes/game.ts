/**
 * Game routes for blackjack
 */

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  getOrCreateUser,
  updateUserBalance,
  getUserBalance,
  saveHandRecord,
  getHandRecords,
} from '../db';
import {
  generateServerSeed,
  hashServerSeed,
  type ShuffleParams,
} from '@evm-blackjack/shared';
import { saveHandRecord } from '../db';
import {
  dealInitialCards,
  dealCard,
  createHand,
  canSplit,
  canInsurance,
  dealerShouldHit,
  calculatePayout,
  calculateInsurancePayout,
  determineOutcome,
  createShuffledDeck,
} from '../blackjack';
import crypto from 'crypto';
import type { GameState, Card } from '@evm-blackjack/shared';

const router = Router();

// In-memory game states (in production, use Redis or DB)
const gameStates = new Map<string, GameState & { 
  remainingDeck: Array<{ suit: string; rank: string }>;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}>();

/**
 * POST /api/game/new-hand
 * Start a new blackjack hand
 */
router.post('/new-hand', requireAuth, (req: AuthRequest, res: Response) => {
  const { betAmount, clientSeed } = req.body;
  const playerAddress = req.user!.address;

  if (!betAmount || !clientSeed) {
    res.status(400).json({ success: false, error: 'Missing betAmount or clientSeed' });
    return;
  }

  // Check balance
  const balance = BigInt(getUserBalance(playerAddress));
  const bet = BigInt(betAmount);

  if (balance < bet) {
    res.status(400).json({ success: false, error: 'Insufficient balance' });
    return;
  }

  // Generate server seed and hash
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  // Get or create nonce (increment per user)
  const nonce = Date.now(); // Simple nonce, in production use DB counter

  // Create shuffled deck
  const shuffleParams: ShuffleParams = {
    serverSeed,
    clientSeed,
    nonce,
  };
  const shuffledDeck = createShuffledDeck(shuffleParams);

  // Deal initial cards
  const { playerCards, dealerCards, remainingDeck } = dealInitialCards(shuffledDeck);

  // Create hands
  const playerHand = createHand(playerCards);
  const dealerHand = createHand([dealerCards[0]]); // Only show first card initially
  const dealerHiddenCard = dealerCards[1];

  // Deduct bet from balance
  const newBalance = balance - bet;
  updateUserBalance(playerAddress, newBalance.toString());

  // Create game state
  const gameId = crypto.randomUUID();
  const gameState: GameState & { 
    remainingDeck: Array<{ suit: string; rank: string }>;
    serverSeed: string;
    clientSeed: string;
    nonce: number;
  } = {
    id: gameId,
    playerAddress,
    betAmount,
    playerHand,
    dealerHand,
    dealerHiddenCard: dealerHiddenCard as Card,
    status: 'playing',
    canDouble: true,
    canSplit: canSplit(playerHand),
    canInsurance: canInsurance(dealerHand.cards[0]),
    remainingDeck,
    serverSeed,
    clientSeed,
    nonce,
  };

  gameStates.set(gameId, gameState);

  res.json({
    success: true,
    data: {
      gameId,
      serverSeedHash, // Pre-commit hash
      playerHand,
      dealerHand,
      canDouble: gameState.canDouble,
      canSplit: gameState.canSplit,
      canInsurance: gameState.canInsurance,
    },
  });
});

/**
 * POST /api/game/action
 * Player action (hit, stand, double, split, insurance)
 */
router.post('/action', requireAuth, (req: AuthRequest, res: Response) => {
  const { gameId, action, insuranceBet } = req.body;
  const playerAddress = req.user!.address;

  const gameState = gameStates.get(gameId);
  if (!gameState || gameState.playerAddress !== playerAddress) {
    res.status(404).json({ success: false, error: 'Game not found' });
    return;
  }

  if (gameState.status !== 'playing') {
    res.status(400).json({ success: false, error: 'Game not in playing state' });
    return;
  }

  let updatedState = { ...gameState };

  switch (action) {
    case 'hit':
      const { card, newDeck } = dealCard(gameState.remainingDeck);
      updatedState.playerHand = createHand([...gameState.playerHand.cards, card]);
      updatedState.remainingDeck = newDeck;
      updatedState.canDouble = false;
      updatedState.canSplit = false;

      if (updatedState.playerHand.isBusted) {
        updatedState.status = 'resolved';
        updatedState.outcome = 'dealer-win';
        updatedState.payout = '0';
        resolveGame(updatedState);
      }
      break;

    case 'stand':
      updatedState.status = 'dealer-turn';
      playDealerHand(updatedState);
      break;

    case 'double':
      if (!gameState.canDouble) {
        res.status(400).json({ success: false, error: 'Cannot double' });
        return;
      }

      const balance = BigInt(getUserBalance(playerAddress));
      const bet = BigInt(gameState.betAmount);
      if (balance < bet) {
        res.status(400).json({ success: false, error: 'Insufficient balance for double' });
        return;
      }

      // Deduct additional bet
      updateUserBalance(playerAddress, (balance - bet).toString());
      updatedState.betAmount = (bet * BigInt(2)).toString();

      // Deal one card
      const { card: doubleCard, newDeck: doubleDeck } = dealCard(gameState.remainingDeck);
      updatedState.playerHand = createHand([...gameState.playerHand.cards, doubleCard]);
      updatedState.remainingDeck = doubleDeck;
      updatedState.canDouble = false;
      updatedState.canSplit = false;

      if (updatedState.playerHand.isBusted) {
        updatedState.status = 'resolved';
        updatedState.outcome = 'dealer-win';
        updatedState.payout = '0';
        resolveGame(updatedState);
      } else {
        updatedState.status = 'dealer-turn';
        playDealerHand(updatedState);
      }
      break;

    case 'split':
      if (!gameState.canSplit) {
        res.status(400).json({ success: false, error: 'Cannot split' });
        return;
      }

      // For simplicity, we'll handle basic split (two hands)
      // In production, handle multiple splits
      const balanceForSplit = BigInt(getUserBalance(playerAddress));
      const betForSplit = BigInt(gameState.betAmount);
      if (balanceForSplit < betForSplit) {
        res.status(400).json({ success: false, error: 'Insufficient balance for split' });
        return;
      }

      updateUserBalance(playerAddress, (balanceForSplit - betForSplit).toString());

      const card1 = gameState.playerHand.cards[0];
      const card2 = gameState.playerHand.cards[1];
      const { card: splitCard1, newDeck: deckAfterSplit1 } = dealCard(gameState.remainingDeck);
      const { card: splitCard2, newDeck: deckAfterSplit2 } = dealCard(deckAfterSplit1);

      updatedState.splitHands = [
        createHand([card1, splitCard1]),
        createHand([card2, splitCard2]),
      ];
      updatedState.currentHandIndex = 0;
      updatedState.playerHand = updatedState.splitHands[0];
      updatedState.remainingDeck = deckAfterSplit2;
      updatedState.canDouble = true;
      updatedState.canSplit = false;
      break;

    case 'insurance':
      if (!gameState.canInsurance) {
        res.status(400).json({ success: false, error: 'Insurance not available' });
        return;
      }

      if (!insuranceBet) {
        res.status(400).json({ success: false, error: 'Insurance bet required' });
        return;
      }

      const insuranceAmount = BigInt(insuranceBet);
      const balanceForInsurance = BigInt(getUserBalance(playerAddress));
      if (balanceForInsurance < insuranceAmount) {
        res.status(400).json({ success: false, error: 'Insufficient balance for insurance' });
        return;
      }

      updateUserBalance(playerAddress, (balanceForInsurance - insuranceAmount).toString());
      updatedState.insuranceBet = insuranceBet;

      // Check if dealer has blackjack
      const fullDealerHand = createHand([gameState.dealerHand.cards[0], gameState.dealerHiddenCard!]);
      if (fullDealerHand.isBlackjack) {
        // Insurance wins
        const insurancePayout = calculateInsurancePayout(insuranceBet);
        const newBalance = BigInt(getUserBalance(playerAddress)) + BigInt(insurancePayout);
        updateUserBalance(playerAddress, newBalance.toString());
      }
      break;

    default:
      res.status(400).json({ success: false, error: 'Invalid action' });
      return;
  }

  gameStates.set(gameId, updatedState);

  res.json({
    success: true,
    data: {
      gameState: {
        id: updatedState.id,
        playerHand: updatedState.playerHand,
        dealerHand: updatedState.status === 'dealer-turn' || updatedState.status === 'resolved'
          ? createHand([...updatedState.dealerHand.cards, updatedState.dealerHiddenCard!])
          : updatedState.dealerHand,
        status: updatedState.status,
        outcome: updatedState.outcome,
        payout: updatedState.payout,
        canDouble: updatedState.canDouble,
        canSplit: updatedState.canSplit,
        canInsurance: updatedState.canInsurance,
      },
    },
  });
});

/**
 * Play dealer hand (automated)
 */
function playDealerHand(gameState: GameState & { 
  remainingDeck: Array<{ suit: string; rank: string }>;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}): void {
  // Reveal hidden card
  const fullDealerHand = createHand([
    ...gameState.dealerHand.cards,
    gameState.dealerHiddenCard!,
  ]);

  // Dealer must hit until 17+
  while (dealerShouldHit(fullDealerHand)) {
    const { card, newDeck } = dealCard(gameState.remainingDeck);
    fullDealerHand.cards.push(card);
    const updated = createHand(fullDealerHand.cards);
    fullDealerHand.value = updated.value;
    fullDealerHand.isBusted = updated.isBusted;
    gameState.remainingDeck = newDeck;
  }

  gameState.dealerHand = fullDealerHand;
  gameState.status = 'resolved';

  // Determine outcome and payout
  const outcome = determineOutcome(gameState.playerHand, fullDealerHand);
  gameState.outcome = outcome;
  gameState.payout = calculatePayout(
    gameState.betAmount,
    outcome,
    gameState.playerHand.isBlackjack
  );

  resolveGame(gameState);
}

/**
 * Resolve game and update balance
 */
function resolveGame(gameState: GameState & { 
  remainingDeck: Array<{ suit: string; rank: string }>;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}): void {
  const payout = BigInt(gameState.payout || '0');
  if (payout > 0) {
    const currentBalance = BigInt(getUserBalance(gameState.playerAddress));
    const newBalance = currentBalance + payout;
    updateUserBalance(gameState.playerAddress, newBalance.toString());
  }

  // Save hand record
  const allCards: Card[] = [
    ...gameState.playerHand.cards,
    ...gameState.dealerHand.cards,
    ...(gameState.dealerHiddenCard ? [gameState.dealerHiddenCard] : []),
  ];

  // Deal remaining cards that were used
  const usedCards = allCards.length;
  const dealtCards = gameState.remainingDeck.slice(0, Math.max(0, usedCards - 4));
  allCards.push(...dealtCards.map(c => ({
    suit: c.suit as Card['suit'],
    rank: c.rank as Card['rank'],
    value: c.rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.rank) ? 10 : parseInt(c.rank),
  })));

  saveHandRecord({
    id: gameState.id,
    playerAddress: gameState.playerAddress,
    betAmount: gameState.betAmount,
    payout: gameState.payout || '0',
    outcome: gameState.outcome || 'dealer-win',
    provablyFair: {
      serverSeedHash: hashServerSeed(gameState.serverSeed),
      serverSeed: gameState.serverSeed, // Reveal seed
      clientSeed: gameState.clientSeed,
      nonce: gameState.nonce,
      cards: allCards,
      verified: true,
    },
    createdAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
  });

  gameStates.delete(gameState.id);
}

/**
 * GET /api/game/history
 * Get hand history
 */
router.get('/history', requireAuth, (req: AuthRequest, res: Response) => {
  const playerAddress = req.user!.address;
  const limit = parseInt(req.query.limit as string) || 50;

  const records = getHandRecords(playerAddress, limit);

  res.json({
    success: true,
    data: records,
  });
});

export default router;
