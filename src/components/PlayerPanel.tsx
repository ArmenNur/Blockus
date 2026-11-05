import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Moon, Sun, User, WifiOff } from 'lucide-react';
import { scoreOf } from '../game/engine';
import { TOTAL_SQUARES } from '../game/pieces';
import type { PlayerState } from '../game/types';
import { PLAYER_COLORS } from '../lib/colors';

interface Props {
  player: PlayerState;
  active: boolean;
  isYou: boolean;
  away?: boolean;
  compact?: boolean;
  onReplace?: () => void;
}

export function PlayerPanel({ player, active, isYou, away, compact, onReplace }: Props) {
  const c = PLAYER_COLORS[player.color];
  const score = scoreOf(player);
  const pct = (player.placedSquares / TOTAL_SQUARES) * 100;
  const status = player.allPlaced ? 'Full bloom' : player.rested ? 'Resting' : player.out ? 'No room' : null;

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-2xl bg-ink-850/80 ring-1 transition-colors ${compact ? 'p-2.5' : 'p-3.5'} ${
        active ? 'ring-white/25' : 'ring-white/[0.06]'
      } ${player.out ? 'opacity-70' : ''}`}
      // framer keeps stale inline styles when a key disappears, so always send an explicit value
      style={{ boxShadow: active ? `0 0 0 1px ${c.fill}, 0 12px 40px -12px ${c.glow}` : '0 0 0 0px rgba(0,0,0,0), 0 0 0 0 rgba(0,0,0,0)' }}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: c.fill }} />
      <div className="flex items-center gap-2.5 pl-1.5">
        <div className="relative hidden h-9 w-9 shrink-0 place-items-center rounded-xl sm:grid" style={{ background: `${c.fill}22`, color: c.fill }}>
          {player.kind === 'bot' ? <Bot size={18} /> : <User size={18} />}
          {active && !player.out && (
            <motion.span
              className="absolute inset-0 rounded-xl ring-2"
              style={{ ['--tw-ring-color' as string]: c.fill }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-ink-100">{player.name}</span>
            {player.kind === 'bot' && <Bot size={13} className="shrink-0 text-ink-400 sm:hidden" />}
            {isYou && <span className="rounded-md bg-white/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-ink-200">You</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-300">
            {away ? (
              <span className="inline-flex items-center gap-1 text-[#ffb0b0]">
                <WifiOff size={12} /> Away
              </span>
            ) : status ? (
              <span className="inline-flex items-center gap-1">
                {player.allPlaced ? <Sun size={12} className="text-sun" /> : <Moon size={12} />} {status}
              </span>
            ) : (
              <span className="truncate">
                {player.remaining.length}
                <span className="hidden sm:inline"> pieces</span> left
                {player.kind === 'bot' && <span className="hidden text-ink-400 sm:inline"> · {player.difficulty}</span>}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={score}
              initial={{ y: -12, opacity: 0, scale: 1.3 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="font-display text-2xl font-bold tabular-nums leading-none"
              style={{ color: c.light }}
            >
              {score}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {!compact && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div className="h-full rounded-full" style={{ background: c.fill }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
      )}
      {away && onReplace && (
        <button onClick={onReplace} className="mt-2 w-full rounded-lg bg-white/[0.07] py-1.5 text-xs font-semibold text-ink-200 hover:bg-white/[0.12]">
          Replace with bot
        </button>
      )}
    </motion.div>
  );
}
