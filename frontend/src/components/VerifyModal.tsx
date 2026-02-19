import { useState } from 'react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface VerifyModalProps {
  onClose: () => void;
}

export default function VerifyModal({ onClose }: VerifyModalProps) {
  const [serverSeed, setServerSeed] = useState('');
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!serverSeed || !serverSeedHash || !clientSeed || !nonce) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.verifyHand({
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce: parseInt(nonce),
      });

      if (res.success && res.data) {
        setResult(res.data);
        toast.success('Verification successful!');
      } else {
        throw new Error(res.error || 'Verification failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-casino-darker border border-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-casino-gold">Verify Provably Fair</h2>
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
              Server Seed Hash (Pre-commit)
            </label>
            <input
              type="text"
              value={serverSeedHash}
              onChange={(e) => setServerSeedHash(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm"
              placeholder="Hash shown before hand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Server Seed (Revealed)
            </label>
            <input
              type="text"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm"
              placeholder="Seed revealed after hand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Client Seed
            </label>
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm"
              placeholder="Your client seed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nonce
            </label>
            <input
              type="number"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="0"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full px-6 py-3 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          {result && (
            <div className="mt-6 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-4">
              <div className="text-green-300 font-semibold mb-2">✓ Verification Successful</div>
              <div className="text-sm text-gray-300">
                <div className="mb-2">Initial Cards:</div>
                <div className="font-mono text-xs">
                  {JSON.stringify(result.cards?.slice(0, 4) || [], null, 2)}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 text-sm text-blue-300">
            <div className="font-semibold mb-2">How it works:</div>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Server generates a random seed and sends you its hash (pre-commit)</li>
              <li>You provide a client seed</li>
              <li>Cards are shuffled using: HMAC-SHA256(server_seed, client_seed, nonce)</li>
              <li>After the hand, server reveals the seed</li>
              <li>You can verify the hash matches and recompute the shuffle</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
