import { AnimatePresence, motion } from 'framer-motion';
import { FlipHorizontal2, RotateCcw, RotateCw, X } from 'lucide-react';
import { PIECES, PIECE_MAP, transform } from '../game/pieces';
import type { PlayerState } from '../game/types';
import { PLAYER_COLORS } from '../lib/colors';
import { PieceGlyph } from './PieceGlyph';
import { IconButton } from './ui';

export interface Selection {
  pieceId: string;
  rot: number;
  flip: boolean;
}

interface Props {
  player: PlayerState;
  selection: Selection | null;
  playable: Set<string> | null;
  canAct: boolean;
  onSelect: (pieceId: string) => void;
  onRotate: (dir: 1 | -1) => void;
  onFlip: () => void;
  onClear: () => void;
}

/** Biggest pieces first — they are the hardest to fit later. */
const ORDER = [...PIECES].sort((a, b) => b.size - a.size);

export function PieceTray({ player, selection, playable, canAct, onSelect, onRotate, onFlip, onClear }: Props) {
  const color = PLAYER_COLORS[player.color];
  const remaining = new Set(player.remaining);
  const selected = selection ? PIECE_MAP[selection.pieceId] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* preview */}
      <div className="flex items-center gap-3 rounded-2xl bg-ink-950/50 p-3 ring-1 ring-white/[0.06]">
        <div className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-xl bg-ink-850 ring-1 ring-white/5">
          <AnimatePresence mode="popLayout" initial={false}>
            {selected && selection ? (
              <motion.div
                key={`${selection.pieceId}-${selection.rot}-${selection.flip}`}
                initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <PieceGlyph cells={transform(selected.base, selection.rot, selection.flip)} color={color} unit={15} />
              </motion.div>
            ) : (
              <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2 text-center text-[11px] leading-tight text-ink-400">
                Pick a piece
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold leading-tight text-ink-100">{selected ? selected.name : 'Seed packet'}</div>
          <div className="text-xs text-ink-300">
            {selected ? `${selected.size} square${selected.size > 1 ? 's' : ''}` : `${player.remaining.length} of ${PIECES.length} left`}
          </div>
          <div className="mt-1.5 flex gap-1">
            <IconButton label="Rotate left (Q)" disabled={!selected} onClick={() => onRotate(-1)} className="h-8 w-8">
              <RotateCcw size={16} />
            </IconButton>
            <IconButton label="Rotate right (R / right-click)" disabled={!selected} onClick={() => onRotate(1)} className="h-8 w-8">
              <RotateCw size={16} />
            </IconButton>
            <IconButton label="Flip (F)" disabled={!selected} onClick={onFlip} className="h-8 w-8">
              <FlipHorizontal2 size={16} />
            </IconButton>
            <IconButton label="Put back (Esc)" disabled={!selected} onClick={onClear} className="h-8 w-8">
              <X size={16} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* pieces */}
      <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
        {ORDER.map((p) => {
          const left = remaining.has(p.id);
          const fits = !playable || playable.has(p.id);
          const isSel = selection?.pieceId === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              layout
              disabled={!left}
              onClick={() => onSelect(p.id)}
              whileHover={left ? { y: -2 } : undefined}
              whileTap={left ? { scale: 0.94 } : undefined}
              title={!left ? `${p.name} — planted` : !fits && canAct ? `${p.name} — no room right now` : p.name}
              className={`relative grid h-[72px] min-w-[72px] place-items-center rounded-xl ring-1 transition-colors ${
                isSel ? 'bg-white/[0.12] ring-white/40' : left ? 'bg-ink-850 ring-white/[0.06] hover:bg-ink-800' : 'bg-transparent ring-white/[0.03]'
              } ${left && !fits && canAct ? 'opacity-40' : ''}`}
            >
              <PieceGlyph cells={p.base} color={color} unit={12} faded={!left} />
              {isSel && <motion.span layoutId="tray-sel" className="absolute inset-0 rounded-xl ring-2" style={{ ['--tw-ring-color' as string]: color.fill }} />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
