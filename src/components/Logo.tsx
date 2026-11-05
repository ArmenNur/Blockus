import { motion } from 'framer-motion';
import { PLAYER_COLORS } from '../lib/colors';

const PATTERN = [
  [0, 0, 0],
  [1, 1, 0],
  [2, 2, 0],
  [3, 2, 1],
  [4, 3, 2],
  [0, 4, 3],
  [1, 4, 3],
  [3, 0, 1],
  [4, 0, 1],
  [4, 1, 1],
  [0, 3, 3],
  [2, 4, 2],
  [3, 4, 2],
  [4, 4, 2],
];

/** Animated 5×5 bloom mark + wordmark. */
export function Logo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const unit = size === 'lg' ? 22 : 9;
  return (
    <div className={`flex items-center ${size === 'lg' ? 'flex-col gap-5' : 'gap-2.5'}`}>
      <svg width={unit * 5} height={unit * 5} viewBox={`0 0 ${unit * 5} ${unit * 5}`} aria-hidden>
        {PATTERN.map(([x, y, c], i) => (
          <motion.rect
            key={i}
            x={x * unit + 1}
            y={y * unit + 1}
            width={unit - 2}
            height={unit - 2}
            rx={unit * 0.26}
            fill={[PLAYER_COLORS[0], PLAYER_COLORS[3], PLAYER_COLORS[1], PLAYER_COLORS[2]][c].fill}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: size === 'lg' ? 0.15 + (x + y) * 0.07 : 0, type: 'spring', stiffness: 380, damping: 18 }}

          />
        ))}
      </svg>
      <span
        className={`font-display font-extrabold tracking-tight text-ink-100 ${size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-xl'}`}
      >
        Bloom<span className="text-sun">grid</span>
      </span>
    </div>
  );
}
