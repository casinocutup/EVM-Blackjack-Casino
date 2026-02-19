/**
 * Authentication middleware for wallet-based auth
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifySignature } from '../wallet';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export interface AuthRequest extends Request {
  user?: {
    address: string;
    chainId: number;
  };
}

/**
 * Generate nonce message for wallet signing
 */
export function generateNonceMessage(address: string, nonce: string): string {
  return `Sign this message to authenticate with EVM Blackjack Casino.\n\nAddress: ${address}\nNonce: ${nonce}`;
}

/**
 * Generate JWT token
 */
export function generateToken(address: string, chainId: number): string {
  return jwt.sign({ address, chainId }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { address: string; chainId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { address: string; chainId: number };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }

  req.user = decoded;
  next();
}

/**
 * Connect wallet endpoint handler
 */
export async function handleConnectWallet(
  address: string,
  message: string,
  signature: string,
  chainId: number
): Promise<{ token: string } | null> {
  const isValid = verifySignature(address, message, signature);
  
  if (!isValid) {
    return null;
  }

  const token = generateToken(address, chainId);
  return { token };
}
