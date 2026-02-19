import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface WalletConnectProps {
  onConnect?: () => void;
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const { address, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!address || !chainId) {
      connect({ connector: connectors[0] });
      return;
    }

    setIsConnecting(true);
    try {
      // Get nonce
      const nonceRes = await apiClient.getNonce(address);
      if (!nonceRes.success || !nonceRes.data) {
        throw new Error('Failed to get nonce');
      }

      const { message } = nonceRes.data;

      // Sign message
      const signature = await signMessageAsync({ message });

      // Connect to backend
      const connectRes = await apiClient.connectWallet({
        address,
        message,
        signature,
        chainId,
      });

      if (!connectRes.success || !connectRes.data) {
        throw new Error('Failed to connect');
      }

      // Store token
      localStorage.setItem('auth_token', connectRes.data.token);
      toast.success('Wallet connected!');
      onConnect?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (address && chainId && !localStorage.getItem('auth_token')) {
      handleConnect();
    }
  }, [address, chainId]);

  return (
    <div className="bg-casino-darker border border-gray-800 rounded-2xl p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-casino-gold mb-2">EVM Blackjack Casino</h2>
        <p className="text-gray-400">Connect your wallet to start playing</p>
      </div>

      <div className="space-y-4">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isConnecting}
            className="w-full px-6 py-4 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg font-semibold transition disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-6 text-center">
        By connecting, you agree to our terms of service
      </p>
    </div>
  );
}
