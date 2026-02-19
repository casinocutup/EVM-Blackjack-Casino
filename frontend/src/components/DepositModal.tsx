import { useState } from 'react';
import { useAccount, useChainId, useSendTransaction } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const HOUSE_WALLET = import.meta.env.VITE_HOUSE_WALLET || '0x0000000000000000000000000000000000000000';

interface DepositModalProps {
  onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [amount, setAmount] = useState('0.1');
  const [txHash, setTxHash] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const { sendTransaction } = useSendTransaction();

  const handleSend = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const value = parseEther(amount);
      sendTransaction({
        to: HOUSE_WALLET as `0x${string}`,
        value,
      });
    } catch (error: any) {
      toast.error('Invalid amount');
    }
  };

  // Handle transaction success/error via wagmi hooks
  // Note: In wagmi v2, useSendTransaction returns mutation object
  // You may need to use useWaitForTransaction for confirmation

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-casino-darker border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-casino-gold">Deposit</h2>
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
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">Send to:</div>
            <div className="text-xs font-mono text-casino-gold break-all mb-4">
              {HOUSE_WALLET}
            </div>
            <div className="flex justify-center">
              <QRCodeSVG value={HOUSE_WALLET} size={150} />
            </div>
          </div>

          {txHash && (
            <div className="bg-green-900 rounded-lg p-4">
              <div className="text-sm text-gray-300 mb-1">Transaction Hash:</div>
              <div className="text-xs font-mono text-green-300 break-all">
                {txHash}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {isRecording ? 'Recording deposit...' : 'Waiting for confirmations...'}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSend}
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex-1 px-6 py-3 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg font-semibold transition disabled:opacity-50"
            >
              Send Transaction
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
