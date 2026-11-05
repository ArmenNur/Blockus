import { AnimatePresence, motion } from 'framer-motion';
import { PIECE_MAP } from '../game/pieces';
import type { GameState } from '../game/types';
import { PLAYER_COLORS } from '../lib/colors';

export function Journal({ state, limit = 7 }: { state: GameState; limit?: number }) {
  const entries = state.log.slice(-limit).reverse();
  return (
    <div className="rounded-2xl bg-ink-850/60 p-3.5 ring-1 ring-white/[0.06]">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Garden journal</div>
      {entries.length === 0 ? (
        <p className="text-sm text-ink-400">Nothing planted yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {entries.map((e) => {
              const p = state.players[e.player];
              const c = PLAYER_COLORS[p.color];
              return (
                <motion.li
                  key={`${e.turn}-${e.kind}-${e.player}`}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-sm text-ink-200"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.fill }} />
                  <span className="truncate">
                    <b className="font-semibold text-ink-100">{p.name}</b>{' '}
                    {e.kind === 'place' && (
                      <>
                        planted {PIECE_MAP[e.pieceId]?.name ?? 'a piece'}
                      </>
                    )}
                    {e.kind === 'out' && 'has no room left'}
                    {e.kind === 'rest' && 'decided to rest'}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
