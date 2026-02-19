import { motion } from 'framer-motion';
import type { Card as CardType } from '@evm-blackjack/shared';

interface CardProps {
  card: CardType;
  hidden?: boolean;
}

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<string, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-black',
  spades: 'text-black',
};

export default function Card({ card, hidden = false }: CardProps) {
  if (hidden) {
    return (
      <motion.div
        className="w-20 h-28 bg-blue-900 border-2 border-white rounded-lg flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.05 }}
      >
        <div className="text-white text-2xl">?</div>
      </motion.div>
    );
  }

  const suitSymbol = suitSymbols[card.suit];
  const suitColor = suitColors[card.suit];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <motion.div
      className="w-20 h-28 bg-white border-2 border-gray-300 rounded-lg shadow-lg flex flex-col items-center justify-center p-2"
      whileHover={{ scale: 1.05, y: -5 }}
      initial={{ rotateY: 180 }}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`text-lg font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
        {card.rank}
      </div>
      <div className={`text-2xl ${suitColor}`}>
        {suitSymbol}
      </div>
    </motion.div>
  );
}
