import { memo, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { isOpening } from '../game/engine';
import type { Cell, GameState } from '../game/types';
import { PLAYER_COLORS, SUN_COLOR, type PlayerColor } from '../lib/colors';

export const CELL = 30;
const PAD = 8;

interface Props {
  state: GameState;
  ghost: { cells: Cell[]; valid: boolean; color: PlayerColor } | null;
  anchors: number[];
  anchorColor: PlayerColor | null;
  hint: Cell[] | null;
  selecting: boolean;
  onHover: (cell: Cell | null) => void;
  onCellTap: (cell: Cell, pointerType: string) => void;
  onRotate: () => void;
}


const Tile = memo(function Tile({ x, y, owner, delay, fresh }: { x: number; y: number; owner: number; delay: number; fresh: boolean }) {
  return (
    <motion.g
      initial={fresh ? { scale: 0.2, opacity: 0, rotate: -12 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 460, damping: 22, delay }}
     
    >
      <rect x={x * CELL + 1.5} y={y * CELL + 1.5} width={CELL - 3} height={CELL - 3} rx={7} fill={`url(#tile-${owner})`} />
      <rect x={x * CELL + 6} y={y * CELL + 5} width={CELL - 12} height={4.5} rx={2.25} fill="#fff" opacity={0.3} />
    </motion.g>
  );
});

export function Board({ state, ghost, anchors, anchorColor, hint, selecting, onHover, onCellTap, onRotate }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { size, board } = state;
  const dim = size * CELL;
  const total = dim + PAD * 2;

  const freshOrder = useMemo(() => {
    const map = new Map<number, number>();
    state.lastMove?.cells.forEach(([x, y], i) => map.set(y * size + x, i));
    return map;
  }, [state.lastMove, size]);

  const toCell = (e: React.PointerEvent): Cell | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const ux = ((e.clientX - r.left) / r.width) * total - PAD;
    const uy = ((e.clientY - r.top) / r.height) * total - PAD;
    const x = Math.floor(ux / CELL);
    const y = Math.floor(uy / CELL);
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    return [x, y];
  };

  const lastColor = state.lastMove ? PLAYER_COLORS[state.players[state.lastMove.player].color] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD} ${-PAD} ${total} ${total}`}
      className="block h-auto w-full select-none"
      style={{ touchAction: selecting ? 'none' : 'manipulation' }}
      onPointerMove={(e) => {
        const c = toCell(e);
        if (c) onHover(c);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') onHover(null);
      }}
      onPointerUp={(e) => {
        const c = toCell(e);
        if (c) onCellTap(c, e.pointerType);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onRotate();
      }}
      role="grid"
      aria-label={`Garden board, ${size} by ${size}`}
    >
      <defs>
        {PLAYER_COLORS.map((c, i) => (
          <linearGradient key={c.key} id={`tile-${i}`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="40%" stopColor={c.fill} />
            <stop offset="100%" stopColor={c.dark} />
          </linearGradient>
        ))}
      </defs>

      <rect x={-PAD} y={-PAD} width={total} height={total} rx={16} fill="#0d1915" stroke="rgba(255,255,255,0.07)" />

      {/* soil */}
      {board.map((_, i) => {
        const x = i % size;
        const y = (i - x) / size;
        return (
          <rect
            key={i}
            x={x * CELL + 1.5}
            y={y * CELL + 1.5}
            width={CELL - 3}
            height={CELL - 3}
            rx={6}
            fill={(x + y) % 2 ? '#172822' : '#152520'}
          />
        );
      })}

      {/* seedbeds */}
      {state.players.map((p, i) => {
        if (!isOpening(p) || p.out) return null;
        const [x, y] = p.seedbed;
        const c = PLAYER_COLORS[p.color];
        return (
          <g key={`bed-${i}`} pointerEvents="none">
            <rect x={x * CELL + 1.5} y={y * CELL + 1.5} width={CELL - 3} height={CELL - 3} rx={6} fill={c.fill} opacity={0.16} />
            <motion.circle
              cx={x * CELL + CELL / 2}
              cy={y * CELL + CELL / 2}
              r={CELL * 0.27}
              fill="none"
              stroke={c.fill}
              strokeWidth={2.4}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            />
          </g>
        );
      })}

      {/* planted tiles */}
      {board.map((owner, i) => {
        if (owner === -1) return null;
        const order = freshOrder.get(i);
        return (
          <Tile
            key={`${state.id}-${i}-${owner}`}
            x={i % size}
            y={Math.floor(i / size)}
            owner={state.players[owner].color}
            fresh={order !== undefined}
            delay={(order ?? 0) * 0.045}
          />
        );
      })}

      {/* last move outline */}
      {state.lastMove && lastColor && (
        <motion.g
          key={`last-${state.turn}`}
          pointerEvents="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.95, 0.5] }}
          transition={{ duration: 1.2 }}
        >
          {state.lastMove.cells.map(([x, y]) => (
            <rect
              key={`${x},${y}`}
              x={x * CELL + 0.5}
              y={y * CELL + 0.5}
              width={CELL - 1}
              height={CELL - 1}
              rx={8}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.4}
            />
          ))}
        </motion.g>
      )}

      {/* growth points for the active human */}
      {anchorColor &&
        anchors.map((i) => (
          <motion.circle
            key={`a-${i}`}
            pointerEvents="none"
            cx={(i % size) * CELL + CELL / 2}
            cy={Math.floor(i / size) * CELL + CELL / 2}
            r={3.4}
            fill={anchorColor.fill}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
           
          />
        ))}

      {/* hint */}
      {hint && (
        <motion.g pointerEvents="none" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.3 }}>
          {hint.map(([x, y]) => (
            <rect
              key={`h-${x},${y}`}
              x={x * CELL + 2}
              y={y * CELL + 2}
              width={CELL - 4}
              height={CELL - 4}
              rx={7}
              fill={SUN_COLOR}
              fillOpacity={0.14}
              stroke={SUN_COLOR}
              strokeWidth={2}
              strokeDasharray="5 3"
            />
          ))}
        </motion.g>
      )}

      {/* ghost */}
      {ghost && (
        <g pointerEvents="none">
          {ghost.cells
            .filter(([x, y]) => x >= 0 && y >= 0 && x < size && y < size)
            .map(([x, y]) => (
              <rect
                key={`g-${x},${y}`}
                x={x * CELL + 1.5}
                y={y * CELL + 1.5}
                width={CELL - 3}
                height={CELL - 3}
                rx={7}
                fill={ghost.valid ? ghost.color.fill : '#ff6b6b'}
                fillOpacity={ghost.valid ? 0.62 : 0.3}
                stroke={ghost.valid ? ghost.color.light : '#ff8a8a'}
                strokeWidth={1.6}
              />
            ))}
        </g>
      )}
    </svg>
  );
}
