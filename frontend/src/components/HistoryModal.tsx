import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import type { HandRecord } from '@evm-blackjack/shared';

interface HistoryModalProps {
  onClose: () => void;
}

export default function HistoryModal({ onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<HandRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiClient.getHistory(50);
        if (res.success && res.data) {
          setHistory(res.data);
        }
      } catch (error) {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-casino-darker border border-gray-800 rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-casino-gold">Hand History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No hands played yet</div>
        ) : (
          <div className="space-y-4">
            {history.map((hand) => (
              <div
                key={hand.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm text-gray-400">
                      {new Date(hand.createdAt).toLocaleString()}
                    </div>
                    <div className="text-lg font-semibold text-white">
                      Bet: {formatEther(BigInt(hand.betAmount))} ETH
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      hand.outcome === 'player-win' || hand.outcome === 'blackjack'
                        ? 'text-green-400'
                        : hand.outcome === 'push'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}>
                      {hand.outcome}
                    </div>
                    <div className="text-sm text-gray-400">
                      Payout: {formatEther(BigInt(hand.payout))} ETH
                    </div>
                  </div>
                </div>
                {hand.provablyFair.serverSeed && (
                  <div className="mt-2 text-xs text-gray-500">
                    Server Seed: {hand.provablyFair.serverSeed.slice(0, 16)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
