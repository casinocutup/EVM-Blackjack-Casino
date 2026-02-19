/**
 * Withdrawal routes
 */

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  getUserBalance,
  updateUserBalance,
  createWithdrawalRequest,
  getWithdrawalRequests,
  updateWithdrawalRequest,
} from '../db';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/withdraw/request
 * Request a withdrawal
 */
router.post('/request', requireAuth, (req: AuthRequest, res: Response) => {
  const { amount, toAddress, chainId, tokenAddress } = req.body;
  const playerAddress = req.user!.address;

  if (!amount || !toAddress || !chainId) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  // Validate address
  if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    res.status(400).json({ success: false, error: 'Invalid address' });
    return;
  }

  // Check balance
  const balance = BigInt(getUserBalance(playerAddress));
  const withdrawAmount = BigInt(amount);

  if (balance < withdrawAmount) {
    res.status(400).json({ success: false, error: 'Insufficient balance' });
    return;
  }

  // Create withdrawal request
  const requestId = crypto.randomUUID();
  createWithdrawalRequest({
    id: requestId,
    playerAddress,
    amount,
    toAddress: toAddress.toLowerCase(),
    tokenAddress,
    chainId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  // Hold balance (deduct from available balance)
  const newBalance = balance - withdrawAmount;
  updateUserBalance(playerAddress, newBalance.toString());

  res.json({
    success: true,
    data: {
      requestId,
      amount,
      toAddress,
      status: 'pending',
      message: 'Withdrawal request created. Admin will process it.',
    },
  });
});

/**
 * GET /api/withdraw/requests
 * Get withdrawal requests (user's own or all if admin)
 */
router.get('/requests', requireAuth, (req: AuthRequest, res: Response) => {
  const playerAddress = req.user!.address;
  const requests = getWithdrawalRequests(playerAddress);

  res.json({
    success: true,
    data: requests,
  });
});

/**
 * POST /api/withdraw/approve (Admin only - in production, add admin check)
 * Approve and process withdrawal
 */
router.post('/approve', requireAuth, (req: AuthRequest, res: Response) => {
  const { requestId, txHash } = req.body;

  if (!requestId) {
    res.status(400).json({ success: false, error: 'Missing requestId' });
    return;
  }

  const allRequests = getWithdrawalRequests();
  const request = allRequests.find(r => r.id === requestId);

  if (!request) {
    res.status(404).json({ success: false, error: 'Withdrawal request not found' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(400).json({ success: false, error: 'Request already processed' });
    return;
  }

  // Update request
  updateWithdrawalRequest(requestId, {
    status: txHash ? 'sent' : 'approved',
    txHash,
    processedAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: {
      requestId,
      status: txHash ? 'sent' : 'approved',
      txHash,
      message: txHash ? 'Withdrawal sent' : 'Withdrawal approved',
    },
  });
});

export default router;
