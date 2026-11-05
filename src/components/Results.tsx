import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Crown, Home, RefreshCcw } from 'lucide-react';
import { useEffect } from 'react';
import { FULL_BLOOM_BONUS, standings } from '../game/engine';
import type { GameState } from '../game/types';
import { PLAYER_COLORS, SUN_COLOR } from '../lib/colors';
import { sfx } from '../lib/sound';
import { Button, Modal } from './ui';

interface Props {
  state: GameState;
  open: boolean;
  you: number[];
  onClose: () => void;
  onRestart?: () => void;
  onExit: () => void;
  restartNote?: string;
}

export function Results({ state, open, you, onClose, onRestart, onExit, restartNote }: Props) {
  const lines = standings(state);
  const winners = lines.filter((l) => l.rank === 1);
  const youWon = winners.some((w) => you.includes(w.player)) && you.length === 1;
  const title =
    winners.length > 1 ? 'A shared harvest!' : youWon ? 'Your garden wins!' : `${state.players[winners[0].player].name} wins!`;

  useEffect(() => {
    if (!open) return;
    sfx.win();
    const colors = winners.map((w) => PLAYER_COLORS[state.players[w.player].color].fill).concat(SUN_COLOR);
    const fire = (x: number) => confetti({ particleCount: 70, spread: 70, startVelocity: 45, origin: { x, y: 0.6 }, colors, disableForReducedMotion: true });
    fire(0.25);
    const t = window.setTimeout(() => fire(0.75), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="-mt-2 mb-5 text-sm text-ink-300">
        1 point per planted square · +{FULL_BLOOM_BONUS} for planting every piece
      </p>
      <ol className="flex flex-col gap-2.5">
        {lines.map((l, i) => {
          const p = state.players[l.player];
          const c = PLAYER_COLORS[p.color];
          return (
            <motion.li
              key={l.player}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12 }}
              className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${l.rank === 1 ? 'bg-white/[0.07] ring-white/20' : 'bg-ink-900/50 ring-white/[0.05]'}`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-lg font-bold" style={{ background: `${c.fill}26`, color: c.light }}>
                {l.rank === 1 ? <Crown size={20} /> : l.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink-100">
                  {p.name}
                  {you.includes(l.player) && you.length === 1 && p.name.toLowerCase() !== 'you' && <span className="ml-1.5 text-xs text-ink-300">(you)</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-300">
                  <span>{l.squares} squares</span>
                  {l.bonus > 0 && <span className="text-[#a3f0cf]">Full bloom +{l.bonus}</span>}
                  {l.remainingSquares > 0 && <span className="text-ink-400">{l.remainingSquares} unplanted</span>}
                </div>
              </div>
              <div className="font-display text-3xl font-extrabold tabular-nums" style={{ color: c.light }}>
                {l.total}
              </div>
            </motion.li>
          );
        })}
      </ol>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          View board
        </Button>
        <Button variant="soft" onClick={onExit}>
          <Home size={16} /> Menu
        </Button>
        {onRestart ? (
          <Button variant="primary" onClick={onRestart}>
            <RefreshCcw size={16} /> Play again
          </Button>
        ) : (
          restartNote && <span className="self-center px-2 text-xs text-ink-400">{restartNote}</span>
        )}
      </div>
    </Modal>
  );
}
