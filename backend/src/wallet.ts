/**
 * Wallet and transaction utilities
 */

import { ethers } from 'ethers';
import type { PendingDeposit } from '@evm-blackjack/shared';

const RPC_URLS: Record<number, string> = {
  1: process.env.ETHEREUM_RPC_URL || '',
  8453: process.env.BASE_RPC_URL || '',
  42161: process.env.ARBITRUM_RPC_URL || '',
  137: process.env.POLYGON_RPC_URL || '',
};

/**
 * Get RPC provider for chain
 */
export function getProvider(chainId: number): ethers.JsonRpcProvider | null {
  const url = RPC_URLS[chainId];
  if (!url) {
    console.warn(`No RPC URL configured for chain ${chainId}`);
    return null;
  }
  return new ethers.JsonRpcProvider(url);
}

/**
 * Verify wallet signature
 */
export function verifySignature(
  address: string,
  message: string,
  signature: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Check transaction status and confirmations
 */
export async function checkTransaction(
  txHash: string,
  chainId: number
): Promise<{
  confirmed: boolean;
  confirmations: number;
  blockNumber?: number;
  amount?: string;
  to?: string;
  from?: string;
}> {
  const provider = getProvider(chainId);
  if (!provider) {
    return { confirmed: false, confirmations: 0 };
  }

  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return { confirmed: false, confirmations: 0 };
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { confirmed: false, confirmations: 0 };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;
    const requiredConfirmations = parseInt(process.env.TX_CONFIRMATION_BLOCKS || '3');

    return {
      confirmed: confirmations >= requiredConfirmations,
      confirmations,
      blockNumber: receipt.blockNumber,
      amount: tx.value?.toString(),
      to: tx.to?.toLowerCase(),
      from: tx.from?.toLowerCase(),
    };
  } catch (error) {
    console.error('Transaction check error:', error);
    return { confirmed: false, confirmations: 0 };
  }
}

/**
 * Check ERC20 transfer transaction
 */
export async function checkERC20Transaction(
  txHash: string,
  chainId: number,
  expectedToken: string,
  expectedTo: string
): Promise<{
  confirmed: boolean;
  confirmations: number;
  blockNumber?: number;
  amount?: string;
}> {
  const provider = getProvider(chainId);
  if (!provider) {
    return { confirmed: false, confirmations: 0 };
  }

  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { confirmed: false, confirmations: 0 };
    }

    // Parse Transfer event from ERC20
    const erc20Interface = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ]);

    let transferAmount: string | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = erc20Interface.parseLog(log);
        if (
          parsed &&
          parsed.name === 'Transfer' &&
          log.address.toLowerCase() === expectedToken.toLowerCase() &&
          parsed.args.to.toLowerCase() === expectedTo.toLowerCase()
        ) {
          transferAmount = parsed.args.value.toString();
          break;
        }
      } catch {
        // Not a Transfer event, continue
      }
    }

    if (!transferAmount) {
      return { confirmed: false, confirmations: 0 };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;
    const requiredConfirmations = parseInt(process.env.TX_CONFIRMATION_BLOCKS || '3');

    return {
      confirmed: confirmations >= requiredConfirmations,
      confirmations,
      blockNumber: receipt.blockNumber,
      amount: transferAmount,
    };
  } catch (error) {
    console.error('ERC20 transaction check error:', error);
    return { confirmed: false, confirmations: 0 };
  }
}

/**
 * Poll transaction until confirmed
 */
export async function pollTransaction(
  txHash: string,
  chainId: number,
  isERC20: boolean,
  expectedToken?: string,
  expectedTo?: string
): Promise<PendingDeposit> {
  const interval = parseInt(process.env.TX_POLL_INTERVAL_MS || '5000');
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = isERC20 && expectedToken && expectedTo
      ? await checkERC20Transaction(txHash, chainId, expectedToken, expectedTo)
      : await checkTransaction(txHash, chainId);

    if (result.confirmed) {
      return {
        txHash,
        amount: result.amount || '0',
        tokenAddress: isERC20 ? expectedToken : undefined,
        chainId,
        blockNumber: result.blockNumber,
        confirmations: result.confirmations,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };
    }

    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }

  // Timeout
  return {
    txHash,
    amount: '0',
    tokenAddress: isERC20 ? expectedToken : undefined,
    chainId,
    confirmations: 0,
    status: 'failed',
    createdAt: new Date().toISOString(),
  };
}
