interface BettingPanelProps {
  betAmount: string;
  onBetAmountChange: (amount: string) => void;
  clientSeed: string;
  onClientSeedChange: (seed: string) => void;
  onStart: () => void;
  loading: boolean;
}

export default function BettingPanel({
  betAmount,
  onBetAmountChange,
  clientSeed,
  onClientSeedChange,
  onStart,
  loading,
}: BettingPanelProps) {
  const presetBets = ['0.01', '0.05', '0.1', '0.5', '1.0'];

  return (
    <div className="bg-casino-darker border border-gray-800 rounded-2xl p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-casino-gold mb-6 text-center">Place Your Bet</h2>

      <div className="space-y-6">
        {/* Bet Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bet Amount (ETH)
          </label>
          <div className="flex gap-2 mb-2">
            {presetBets.map((preset) => (
              <button
                key={preset}
                onClick={() => onBetAmountChange(preset)}
                className={`px-4 py-2 rounded-lg transition ${
                  betAmount === preset
                    ? 'bg-casino-gold text-black font-semibold'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={betAmount}
            onChange={(e) => onBetAmountChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-casino-gold"
            placeholder="0.01"
          />
        </div>

        {/* Client Seed */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Client Seed (for provable fairness)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => onClientSeedChange(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-casino-gold font-mono text-sm"
              placeholder="Enter your seed or use random"
            />
            <button
              onClick={() => onClientSeedChange(Math.random().toString(36).substring(2, 15))}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Random
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This seed, combined with the server seed, determines card order
          </p>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          disabled={loading || parseFloat(betAmount) <= 0}
          className="w-full px-6 py-4 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Deal Cards'}
        </button>
      </div>
    </div>
  );
}
