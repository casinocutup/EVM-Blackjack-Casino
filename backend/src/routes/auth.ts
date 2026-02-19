/**
 * Authentication routes
 */

import { Router, Request, Response } from 'express';
import { handleConnectWallet, generateNonceMessage } from '../middleware/auth';
import { getOrCreateUser } from '../db';
import crypto from 'crypto';

const router = Router();

// Store nonces temporarily (in production, use Redis)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

/**
 * GET /api/auth/nonce
 * Get a nonce for wallet signing
 */
router.get('/nonce', (req: Request, res: Response) => {
  const address = req.query.address as string;
  
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    res.status(400).json({ success: false, error: 'Invalid address' });
    return;
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  nonceStore.set(address.toLowerCase(), { nonce, expiresAt });
  
  const message = generateNonceMessage(address, nonce);
  
  res.json({
    success: true,
    data: {
      nonce,
      message,
    },
  });
});

/**
 * POST /api/auth/connect
 * Verify signature and return JWT token
 */
router.post('/connect', async (req: Request, res: Response) => {
  const { address, message, signature, chainId } = req.body;

  if (!address || !message || !signature || !chainId) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  // Verify nonce is valid
  const stored = nonceStore.get(address.toLowerCase());
  if (!stored || stored.expiresAt < Date.now()) {
    res.status(400).json({ success: false, error: 'Invalid or expired nonce' });
    return;
  }

  // Verify message contains the nonce
  if (!message.includes(stored.nonce)) {
    res.status(400).json({ success: false, error: 'Invalid message' });
    return;
  }

  const result = await handleConnectWallet(address, message, signature, chainId);
  
  if (!result) {
    res.status(401).json({ success: false, error: 'Invalid signature' });
    return;
  }

  // Create or get user
  getOrCreateUser(address.toLowerCase());

  // Clean up nonce
  nonceStore.delete(address.toLowerCase());

  res.json({
    success: true,
    data: {
      token: result.token,
      address: address.toLowerCase(),
    },
  });
});

export default router;
