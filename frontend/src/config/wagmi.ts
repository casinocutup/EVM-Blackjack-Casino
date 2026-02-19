import { createConfig, http } from 'wagmi';
import { mainnet, base, arbitrum, polygon } from 'wagmi/chains';
import { metaMask, walletConnect } from 'wagmi/connectors';

const projectId = process.env.VITE_WALLETCONNECT_PROJECT_ID || 'your-project-id';

export const config = createConfig({
  chains: [mainnet, base, arbitrum, polygon],
  connectors: [
    metaMask(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
  },
});
