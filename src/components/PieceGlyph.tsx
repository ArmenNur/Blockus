import type { Cell } from '../game/types';
import type { PlayerColor } from '../lib/colors';

interface Props {
  cells: Cell[];
  color: PlayerColor;
  unit?: number;
  faded?: boolean;
  className?: string;
}

/** A small static drawing of a piece. */
export function PieceGlyph({ cells, color, unit = 12, faded = false, className }: Props) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  return (
    <svg viewBox={`0 0 ${w * unit} ${h * unit}`} width={w * unit} height={h * unit} className={className} aria-hidden>
      {cells.map(([x, y]) => (
        <g key={`${x},${y}`}>
          <rect
            x={x * unit + 0.75}
            y={y * unit + 0.75}
            width={unit - 1.5}
            height={unit - 1.5}
            rx={unit * 0.24}
            fill={faded ? 'transparent' : color.fill}
            stroke={faded ? color.fill : color.dark}
            strokeOpacity={faded ? 0.35 : 0.7}
            strokeWidth={faded ? 1 : 0.8}
            strokeDasharray={faded ? '2 2' : undefined}
          />
          {!faded && (
            <rect x={x * unit + unit * 0.2} y={y * unit + unit * 0.16} width={unit * 0.6} height={unit * 0.16} rx={unit * 0.08} fill="#fff" opacity={0.3} />
          )}
        </g>
      ))}
    </svg>
  );
}
