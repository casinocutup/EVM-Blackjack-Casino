/**
 * Balance and deposit routes
 */

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  getOrCreateUser,
  getUserBalance,
  addPendingDeposit,
  getPendingDeposits,
  updateDepositStatus,
  updateUserBalance,
} from '../db';
import { checkTransaction, checkERC20Transaction, pollTransaction } from '../wallet';
import { ethers } from 'ethers';

const router = Router();

const HOUSE_WALLET = process.env.HOUSE_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

/**
 * GET /api/balance
 * Get user balance and pending deposits
 */
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const playerAddress = req.user!.address;
  const user = getOrCreateUser(playerAddress);

  res.json({
    success: true,
    data: {
      balance: user.balance,
      pendingDeposits: user.pendingDeposits,
    },
  });
});

/**
 * POST /api/balance/deposit
 * Record a pending deposit transaction
 */
router.post('/deposit', requireAuth, async (req: AuthRequest, res: Response) => {
  const { txHash, chainId, tokenAddress } = req.body;
  const playerAddress = req.user!.address;

  if (!txHash || !chainId) {
    res.status(400).json({ success: false, error: 'Missing txHash or chainId' });
    return;
  }

  // Check if deposit already exists
  const existing = getPendingDeposits(playerAddress).find(d => d.txHash === txHash);
  if (existing) {
    res.json({
      success: true,
      data: existing,
      message: 'Deposit already recorded',
    });
    return;
  }

  // Initial check
  const isERC20 = !!tokenAddress;
  let initialCheck;

  if (isERC20) {
    initialCheck = await checkERC20Transaction(txHash, chainId, tokenAddress, HOUSE_WALLET.toLowerCase());
  } else {
    initialCheck = await checkTransaction(txHash, chainId);
  }

  if (!initialCheck.confirmed && initialCheck.confirmations === 0) {
    // Transaction not found yet, create pending deposit
    addPendingDeposit({
      txHash,
      playerAddress,
      amount: '0', // Will be updated when confirmed
      tokenAddress,
      chainId,
      confirmations: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Start polling in background (in production, use job queue)
    pollTransaction(txHash, chainId, isERC20, tokenAddress, HOUSE_WALLET.toLowerCase())
      .then(result => {
        if (result.status === 'confirmed') {
          // Credit balance
          const currentBalance = BigInt(getUserBalance(playerAddress));
          const depositAmount = BigInt(result.amount);
          updateUserBalance(playerAddress, (currentBalance + depositAmount).toString());
          updateDepositStatus(txHash, 'confirmed', result.confirmations, result.blockNumber);
        } else {
          updateDepositStatus(txHash, 'failed');
        }
      })
      .catch(err => {
        console.error('Deposit polling error:', err);
        updateDepositStatus(txHash, 'failed');
      });

    res.json({
      success: true,
      data: {
        txHash,
        status: 'pending',
        message: 'Deposit recorded, waiting for confirmations',
      },
    });
    return;
  }

  // Transaction already confirmed
  if (initialCheck.confirmed) {
    const amount = initialCheck.amount || '0';
    addPendingDeposit({
      txHash,
      playerAddress,
      amount,
      tokenAddress,
      chainId,
      confirmations: initialCheck.confirmations,
      status: 'confirmed',
      blockNumber: initialCheck.blockNumber,
      createdAt: new Date().toISOString(),
    });

    // Credit balance
    const currentBalance = BigInt(getUserBalance(playerAddress));
    const depositAmount = BigInt(amount);
    updateUserBalance(playerAddress, (currentBalance + depositAmount).toString());

    res.json({
      success: true,
      data: {
        txHash,
        amount,
        status: 'confirmed',
        confirmations: initialCheck.confirmations,
      },
    });
  } else {
    res.status(400).json({ success: false, error: 'Transaction not found or invalid' });
  }
});

/**
 * GET /api/balance/deposit/:txHash
 * Check deposit status
 */
router.get('/deposit/:txHash', requireAuth, async (req: AuthRequest, res: Response) => {
  const { txHash } = req.params;
  const playerAddress = req.user!.address;

  const deposits = getPendingDeposits(playerAddress);
  const deposit = deposits.find(d => d.txHash === txHash);

  if (!deposit) {
    res.status(404).json({ success: false, error: 'Deposit not found' });
    return;
  }

  if (deposit.status === 'pending') {
    // Re-check transaction
    const isERC20 = !!deposit.tokenAddress;
    const check = isERC20 && deposit.tokenAddress
      ? await checkERC20Transaction(txHash, deposit.chainId, deposit.tokenAddress, HOUSE_WALLET.toLowerCase())
      : await checkTransaction(txHash, deposit.chainId);

    if (check.confirmed) {
      const amount = check.amount || '0';
      updateDepositStatus(txHash, 'confirmed', check.confirmations, check.blockNumber);
      
      // Update amount if needed
      if (amount !== deposit.amount) {
        // Re-credit if amount changed
        const currentBalance = BigInt(getUserBalance(playerAddress));
        const oldAmount = BigInt(deposit.amount);
        const newAmount = BigInt(amount);
        const diff = newAmount - oldAmount;
        if (diff > 0) {
          updateUserBalance(playerAddress, (currentBalance + diff).toString());
        }
      }

      res.json({
        success: true,
        data: {
          ...deposit,
          status: 'confirmed',
          amount: check.amount,
          confirmations: check.confirmations,
        },
      });
      return;
    }
  }

  res.json({
    success: true,
    data: deposit,
  });
});

export default router;
