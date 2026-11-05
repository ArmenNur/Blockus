import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { FULL_BLOOM_BONUS } from '../game/engine';
import { PLAYER_COLORS } from '../lib/colors';
import { Modal } from './ui';

type Mark = 'a' | 'b' | 'ok' | 'bad' | 'bed';

/** Tiny illustrative grid: rows of characters. a/b = players, + = legal, x = illegal, o = seedbed */
function Mini({ rows, unit = 18 }: { rows: string[]; unit?: number }) {
  const cells: Array<{ x: number; y: number; m: Mark }> = [];
  const map: Record<string, Mark> = { a: 'a', b: 'b', '+': 'ok', x: 'bad', o: 'bed' };
  rows.forEach((r, y) => [...r].forEach((ch, x) => map[ch] && cells.push({ x, y, m: map[ch] })));
  const w = rows[0].length;
  const h = rows.length;
  const A = PLAYER_COLORS[0];
  const B = PLAYER_COLORS[2];
  return (
    <svg viewBox={`0 0 ${w * unit} ${h * unit}`} width={w * unit} height={h * unit} className="shrink-0" aria-hidden>
      {rows.map((r, y) =>
        [...r].map((_, x) => <rect key={`${x}-${y}`} x={x * unit + 1} y={y * unit + 1} width={unit - 2} height={unit - 2} rx={4} fill="#172822" />),
      )}
      {cells.map(({ x, y, m }) => {
        const k = `${x}-${y}-${m}`;
        const base = { x: x * unit + 1, y: y * unit + 1, width: unit - 2, height: unit - 2, rx: 4 };
        if (m === 'a' || m === 'b') return <rect key={k} {...base} fill={m === 'a' ? A.fill : B.fill} />;
        if (m === 'ok') return <rect key={k} {...base} fill={A.fill} fillOpacity={0.55} stroke={A.light} strokeWidth={1.2} />;
        if (m === 'bad') return <rect key={k} {...base} fill="#ff6b6b" fillOpacity={0.3} stroke="#ff8a8a" strokeWidth={1.2} />;
        return <circle key={k} cx={x * unit + unit / 2} cy={y * unit + unit / 2} r={unit * 0.28} fill="none" stroke={A.fill} strokeWidth={2} />;
      })}
    </svg>
  );
}

function Step({ n, title, children, art }: { n: number; title: string; children: ReactNode; art: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-ink-900/60 p-4 ring-1 ring-white/[0.05] sm:flex-row sm:items-center">
      <div className="flex justify-center sm:w-[132px]">{art}</div>
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-sun text-xs font-bold text-ink-950">{n}</span>
          <h3 className="font-display text-lg font-bold text-ink-100">{title}</h3>
        </div>
        <div className="text-sm leading-relaxed text-ink-300">{children}</div>
      </div>
    </div>
  );
}

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="How to grow a Bloomgrid" wide>
      <div className="flex flex-col gap-3">
        <Step n={1} title="Plant on your seedbed" art={<Mini rows={['aa...', 'a....', '.....']} />}>
          Everyone starts with the same 18-piece seed packet. Your first piece must cover the glowing seedbed in your corner of the garden.
        </Step>
        <Step
          n={2}
          title="Grow corner to corner"
          art={
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <Mini rows={['aa...', 'a.++.', '...+.']} unit={14} />
                <Check size={16} className="text-[#a3f0cf]" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Mini rows={['aaxx.', 'a....', '.....']} unit={14} />
                <X size={16} className="text-[#ff8a8a]" />
              </div>
            </div>
          }
        >
          Every new piece must touch one of <b className="text-ink-100">your</b> pieces at a corner, and may never share a flat edge with your own pieces. Touching
          other gardens is fine — use that to cut off their growth.
        </Step>
        <Step n={3} title="Bloom for points" art={<Mini rows={['aab..', '.ab.b', 'a.bb.']} />}>
          When you have no room left you are out; the game ends when nobody can grow. You score 1 point per planted square and
          <b className="text-[#a3f0cf]"> +{FULL_BLOOM_BONUS}</b> if you plant your entire packet. Highest garden wins.
        </Step>
        <div className="rounded-2xl bg-ink-900/60 p-4 text-sm text-ink-300 ring-1 ring-white/[0.05]">
          <div className="mb-2 font-display text-base font-bold text-ink-100">Controls</div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            <li>
              <Kbd>Click</Kbd> a piece, then click the board to plant
            </li>
            <li>
              <Kbd>R</Kbd> / right-click rotate · <Kbd>Q</Kbd> rotate back
            </li>
            <li>
              <Kbd>F</Kbd> flip · <Kbd>Esc</Kbd> put the piece back
            </li>
            <li>
              <Kbd>H</Kbd> hint · <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> undo (local games)
            </li>
            <li className="sm:col-span-2">
              On touch screens: tap the board to preview, tap the same spot again (or <b className="text-ink-100">Plant</b>) to confirm. Dots show where you can grow.
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-100 ring-1 ring-white/10">{children}</kbd>;
}
