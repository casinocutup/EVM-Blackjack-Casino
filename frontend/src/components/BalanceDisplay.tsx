import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { apiClient } from '../api/client';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';

export default function BalanceDisplay() {
  const { address } = useAccount();
  const [balance, setBalance] = useState('0');
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    if (!address) return;

    try {
      const res = await apiClient.getBalance();
      if (res.success && res.data) {
        setBalance(res.data.balance);
        setPendingCount(res.data.pendingDeposits.filter((d: any) => d.status === 'pending').length);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [address]);

  if (loading) {
    return (
      <div className="px-4 py-2 bg-gray-800 rounded-lg">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  const balanceEth = formatEther(BigInt(balance || '0'));

  return (
    <div className="px-4 py-2 bg-gray-800 rounded-lg flex items-center gap-3">
      <div>
        <div className="text-sm text-gray-400">Balance</div>
        <div className="text-lg font-semibold text-casino-gold">
          {parseFloat(balanceEth).toFixed(4)} ETH
        </div>
      </div>
      {pendingCount > 0 && (
        <div className="px-2 py-1 bg-yellow-600 text-black text-xs rounded">
          {pendingCount} pending
        </div>
      )}
    </div>
  );
}
