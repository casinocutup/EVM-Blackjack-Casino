import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import WalletConnect from './components/WalletConnect';
import BlackjackTable from './components/BlackjackTable';
import BalanceDisplay from './components/BalanceDisplay';
import DepositModal from './components/DepositModal';
import WithdrawModal from './components/WithdrawModal';
import HistoryModal from './components/HistoryModal';
import VerifyModal from './components/VerifyModal';

function App() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-casino-dark flex items-center justify-center">
        <WalletConnect onConnect={() => connect({ connector: connectors[0] })} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-casino-dark">
      {/* Header */}
      <header className="bg-casino-darker border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-casino-gold">🎲 EVM Blackjack Casino</h1>
            <span className="text-sm text-gray-400">Provably Fair</span>
          </div>
          
          <div className="flex items-center gap-4">
            <BalanceDisplay />
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              History
            </button>
            <button
              onClick={() => setShowVerify(true)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Verify
            </button>
            <button
              onClick={() => setShowDeposit(true)}
              className="px-4 py-2 bg-casino-green hover:bg-green-600 rounded-lg transition"
            >
              Deposit
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="px-4 py-2 bg-casino-gold hover:bg-yellow-600 text-black rounded-lg transition font-semibold"
            >
              Withdraw
            </button>
            <button
              onClick={() => disconnect()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Disconnect
            </button>
            <div className="text-sm text-gray-400">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <BlackjackTable />
      </main>

      {/* Modals */}
      {showDeposit && (
        <DepositModal onClose={() => setShowDeposit(false)} />
      )}
      {showWithdraw && (
        <WithdrawModal onClose={() => setShowWithdraw(false)} />
      )}
      {showHistory && (
        <HistoryModal onClose={() => setShowHistory(false)} />
      )}
      {showVerify && (
        <VerifyModal onClose={() => setShowVerify(false)} />
      )}
    </div>
  );
}

export default App;
