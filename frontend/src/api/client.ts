/**
 * API client for backend communication
 */

import axios from 'axios';
import type { ApiResponse } from '@evm-blackjack/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AuthNonceResponse {
  nonce: string;
  message: string;
}

export interface AuthConnectResponse {
  token: string;
  address: string;
}

export const apiClient = {
  // Auth
  async getNonce(address: string): Promise<ApiResponse<AuthNonceResponse>> {
    const res = await api.get(`/auth/nonce?address=${address}`);
    return res.data;
  },

  async connectWallet(data: {
    address: string;
    message: string;
    signature: string;
    chainId: number;
  }): Promise<ApiResponse<AuthConnectResponse>> {
    const res = await api.post('/auth/connect', data);
    return res.data;
  },

  // Balance
  async getBalance(): Promise<ApiResponse<{ balance: string; pendingDeposits: any[] }>> {
    const res = await api.get('/balance');
    return res.data;
  },

  async recordDeposit(data: {
    txHash: string;
    chainId: number;
    tokenAddress?: string;
  }): Promise<ApiResponse<any>> {
    const res = await api.post('/balance/deposit', data);
    return res.data;
  },

  async checkDeposit(txHash: string): Promise<ApiResponse<any>> {
    const res = await api.get(`/balance/deposit/${txHash}`);
    return res.data;
  },

  // Game
  async newHand(data: {
    betAmount: string;
    clientSeed: string;
  }): Promise<ApiResponse<any>> {
    const res = await api.post('/game/new-hand', data);
    return res.data;
  },

  async playerAction(data: {
    gameId: string;
    action: 'hit' | 'stand' | 'double' | 'split' | 'insurance';
    insuranceBet?: string;
  }): Promise<ApiResponse<any>> {
    const res = await api.post('/game/action', data);
    return res.data;
  },

  async getHistory(limit?: number): Promise<ApiResponse<any[]>> {
    const res = await api.get(`/game/history?limit=${limit || 50}`);
    return res.data;
  },

  // Withdraw
  async requestWithdrawal(data: {
    amount: string;
    toAddress: string;
    chainId: number;
    tokenAddress?: string;
  }): Promise<ApiResponse<any>> {
    const res = await api.post('/withdraw/request', data);
    return res.data;
  },

  async getWithdrawals(): Promise<ApiResponse<any[]>> {
    const res = await api.get('/withdraw/requests');
    return res.data;
  },

  // Verify
  async verifyHand(data: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  }): Promise<ApiResponse<any>> {
    const res = await api.post('/verify', data);
    return res.data;
  },
};

export default api;
