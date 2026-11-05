import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { PLAYER_COLORS } from '../lib/colors';

/** Slow drifting petals behind everything. Purely decorative. */
export function Backdrop({ count = 14 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        size: 10 + ((i * 13) % 22),
        delay: (i * 1.7) % 12,
        duration: 22 + ((i * 7) % 16),
        color: PLAYER_COLORS[i % PLAYER_COLORS.length].fill,
        rotate: (i * 47) % 360,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {petals.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-[30%]"
          style={{ left: `${p.left}%`, width: p.size, height: p.size, background: p.color, opacity: 0.08 }}
          initial={{ y: '110vh', rotate: p.rotate }}
          animate={{ y: '-15vh', rotate: p.rotate + 240 }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}
