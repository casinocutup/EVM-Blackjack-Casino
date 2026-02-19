import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface WithdrawModalProps {
  onClose: () => void;
}

export default function WithdrawModal({ onClose }: WithdrawModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [amount, setAmount] = useState('');
  const [toAddress, setToAddress] = useState(address || '');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Invalid amount');
      return;
    }

    if (!toAddress || !toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid address');
      return;
    }

    setLoading(true);
    try {
      const amountWei = parseEther(amount).toString();
      const res = await apiClient.requestWithdrawal({
        amount: amountWei,
        toAddress,
        chainId,
      });

      if (res.success) {
        toast.success('Withdrawal request created! Admin will process it.');
        onClose();
      } else {
        throw new Error(res.error || 'Failed to create withdrawal request');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to request withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-casino-darker border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-casino-gold">Withdraw</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (ETH)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              To Address
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm"
              placeholder="0x..."
            />
          </div>

          <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-4">
            <div className="text-sm text-yellow-300">
              ⚠️ Withdrawal requests are processed manually by admin. This may take 24-48 hours.
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleRequest}
              disabled={loading || !amount || !toAddress}
              className="flex-1 px-6 py-3 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Requesting...' : 'Request Withdrawal'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
