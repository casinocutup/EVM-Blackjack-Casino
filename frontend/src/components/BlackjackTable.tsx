import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';
import Card from './Card';
import BettingPanel from './BettingPanel';
import { formatEther, parseEther } from 'viem';
import type { Hand, Card as CardType } from '@evm-blackjack/shared';
import confetti from 'canvas-confetti';

const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
};

interface GameState {
  gameId?: string;
  playerHand?: Hand;
  dealerHand?: Hand;
  status: 'idle' | 'betting' | 'playing' | 'dealer-turn' | 'resolved';
  outcome?: 'player-win' | 'dealer-win' | 'push' | 'blackjack';
  payout?: string;
  canDouble: boolean;
  canSplit: boolean;
  canInsurance: boolean;
  serverSeedHash?: string;
}

export default function BlackjackTable() {
  const { address } = useAccount();
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    canDouble: false,
    canSplit: false,
    canInsurance: false,
  });
  const [betAmount, setBetAmount] = useState('0.01');
  const [clientSeed, setClientSeed] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Generate random client seed on mount
    setClientSeed(Math.random().toString(36).substring(2, 15));
  }, []);

  const startNewHand = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    const betWei = parseEther(betAmount).toString();
    setLoading(true);

    try {
      const res = await apiClient.newHand({
        betAmount: betWei,
        clientSeed: clientSeed || Math.random().toString(36).substring(2, 15),
      });

      if (!res.success || !res.data) {
        throw new Error('Failed to start hand');
      }

      setGameState({
        gameId: res.data.gameId,
        playerHand: res.data.playerHand,
        dealerHand: res.data.dealerHand,
        status: 'playing',
        canDouble: res.data.canDouble,
        canSplit: res.data.canSplit,
        canInsurance: res.data.canInsurance,
        serverSeedHash: res.data.serverSeedHash,
      });

      toast.success('Hand started!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start hand');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'hit' | 'stand' | 'double' | 'split' | 'insurance', insuranceBet?: string) => {
    if (!gameState.gameId) return;

    setLoading(true);
    try {
      const res = await apiClient.playerAction({
        gameId: gameState.gameId,
        action,
        insuranceBet,
      });

      if (!res.success || !res.data) {
        throw new Error('Action failed');
      }

      const updated = res.data.gameState;
      setGameState({
        ...gameState,
        ...updated,
      });

      // Check if resolved
      if (updated.status === 'resolved') {
        if (updated.outcome === 'player-win' || updated.outcome === 'blackjack') {
          triggerConfetti();
          toast.success(`You won! Payout: ${formatEther(BigInt(updated.payout || '0'))} ETH`);
        } else if (updated.outcome === 'push') {
          toast('Push! Bet returned');
        } else {
          toast.error('Dealer wins');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Server Seed Hash Display */}
      {gameState.serverSeedHash && (
        <div className="bg-casino-darker border border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Server Seed Hash (Pre-commit)</div>
          <div className="text-xs font-mono text-casino-gold break-all">{gameState.serverSeedHash}</div>
          <div className="text-xs text-gray-500 mt-2">
            This hash will be verified after the hand completes
          </div>
        </div>
      )}

      {/* Betting Panel */}
      {gameState.status === 'idle' && (
        <BettingPanel
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
          clientSeed={clientSeed}
          onClientSeedChange={setClientSeed}
          onStart={startNewHand}
          loading={loading}
        />
      )}

      {/* Game Table */}
      {gameState.status !== 'idle' && (
        <div className="bg-gradient-to-b from-green-900 to-green-950 rounded-2xl p-8 border-4 border-casino-gold">
          {/* Dealer Hand */}
          <div className="mb-8">
            <div className="text-white mb-4 text-lg font-semibold">Dealer</div>
            <div className="flex gap-2 justify-center">
              <AnimatePresence>
                {gameState.dealerHand?.cards.map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card
                      card={card}
                      hidden={idx === 1 && gameState.status === 'playing'}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {gameState.dealerHand && (
              <div className="text-center mt-2 text-white">
                Value: {gameState.status === 'playing' ? '?' : gameState.dealerHand.value}
              </div>
            )}
          </div>

          {/* Player Hand */}
          <div>
            <div className="text-white mb-4 text-lg font-semibold">You</div>
            <div className="flex gap-2 justify-center">
              <AnimatePresence>
                {gameState.playerHand?.cards.map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card card={card} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {gameState.playerHand && (
              <div className="text-center mt-2 text-white">
                Value: {gameState.playerHand.value}
                {gameState.playerHand.isBlackjack && ' (Blackjack!)'}
                {gameState.playerHand.isBusted && ' (Busted!)'}
              </div>
            )}
          </div>

          {/* Actions */}
          {gameState.status === 'playing' && (
            <div className="mt-8 flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => handleAction('hit')}
                disabled={loading}
                className="px-6 py-3 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg font-semibold transition disabled:opacity-50"
              >
                Hit
              </button>
              <button
                onClick={() => handleAction('stand')}
                disabled={loading}
                className="px-6 py-3 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg font-semibold transition disabled:opacity-50"
              >
                Stand
              </button>
              {gameState.canDouble && (
                <button
                  onClick={() => handleAction('double')}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  Double
                </button>
              )}
              {gameState.canSplit && (
                <button
                  onClick={() => handleAction('split')}
                  disabled={loading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  Split
                </button>
              )}
              {gameState.canInsurance && (
                <button
                  onClick={() => {
                    const insuranceBet = prompt('Insurance bet amount (ETH):');
                    if (insuranceBet) {
                      handleAction('insurance', parseEther(insuranceBet).toString());
                    }
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  Insurance
                </button>
              )}
            </div>
          )}

          {/* Result */}
          {gameState.status === 'resolved' && (
            <div className="mt-8 text-center">
              <div className="text-2xl font-bold text-casino-gold mb-4">
                {gameState.outcome === 'player-win' || gameState.outcome === 'blackjack'
                  ? 'You Win! 🎉'
                  : gameState.outcome === 'push'
                  ? 'Push!'
                  : 'Dealer Wins'}
              </div>
              {gameState.payout && (
                <div className="text-lg text-white">
                  Payout: {formatEther(BigInt(gameState.payout))} ETH
                </div>
              )}
              <button
                onClick={() => setGameState({ status: 'idle', canDouble: false, canSplit: false, canInsurance: false })}
                className="mt-4 px-6 py-3 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg font-semibold transition"
              >
                New Hand
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
