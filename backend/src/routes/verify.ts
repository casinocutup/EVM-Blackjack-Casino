/**
 * Provably fair verification routes
 */

import { Router, Request, Response } from 'express';
import {
  shuffleDeck,
  verifyServerSeed,
  type ShuffleParams,
} from '@evm-blackjack/shared';
import { getHandRecords } from '../db';

const router = Router();

/**
 * POST /api/verify
 * Verify a hand's provably fair result
 */
router.post('/', (req: Request, res: Response) => {
  const { serverSeed, serverSeedHash, clientSeed, nonce } = req.body;

  if (!serverSeed || !serverSeedHash || !clientSeed || nonce === undefined) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  // Verify server seed hash matches
  const isValid = verifyServerSeed(serverSeed, serverSeedHash);
  if (!isValid) {
    res.json({
      success: false,
      error: 'Server seed hash does not match revealed seed',
    });
    return;
  }

  // Recompute shuffle
  const params: ShuffleParams = {
    serverSeed,
    clientSeed,
    nonce,
  };

  const shuffledDeck = shuffleDeck(params);

  // Deal first 4 cards (initial deal)
  const cards = shuffledDeck.slice(0, 4).map(card => ({
    suit: card.suit,
    rank: card.rank,
  }));

  res.json({
    success: true,
    data: {
      verified: true,
      cards,
      fullDeck: shuffledDeck,
    },
  });
});

/**
 * GET /api/verify/hand/:handId
 * Get hand record for verification
 */
router.get('/hand/:handId', (req: Request, res: Response) => {
  const { handId } = req.params;
  const { playerAddress } = req.query;

  if (!playerAddress) {
    res.status(400).json({ success: false, error: 'Missing playerAddress' });
    return;
  }

  const records = getHandRecords(playerAddress as string, 1000);
  const record = records.find(r => r.id === handId);

  if (!record) {
    res.status(404).json({ success: false, error: 'Hand not found' });
    return;
  }

  res.json({
    success: true,
    data: record,
  });
});

export default router;
