import type { Cell } from './types';

export interface PieceDef {
  id: string;
  name: string;
  size: number;
  base: Cell[];
}

/**
 * The Bloomgrid seed packet: 18 shapes, 74 squares.
 * Rows separated by "|", "#" = filled.
 */
const RAW: Array<[string, string, string]> = [
  ['seed', 'Seed', '#'],
  ['sprout', 'Sprout', '##'],
  ['stem', 'Stem', '###'],
  ['bud', 'Bud', '##|#.'],
  ['reed', 'Reed', '####'],
  ['pebble', 'Pebble', '##|##'],
  ['thorn', 'Thorn', '###|.#.'],
  ['crook', 'Crook', '###|#..'],
  ['vine', 'Vine', '.##|##.'],
  ['hook', 'Hook', '####|#...'],
  ['creeper', 'Creeper', '.###|##..'],
  ['bloom', 'Bloom', '##|##|#.'],
  ['trellis', 'Trellis', '###|.#.|.#.'],
  ['cup', 'Cup', '#.#|###'],
  ['elbow', 'Elbow', '#..|#..|###'],
  ['terrace', 'Terrace', '#..|##.|.##'],
  ['clover', 'Clover', '.#.|###|.#.'],
  ['bramble', 'Bramble', '##.|.#.|.##'],
];

export function normalize(cells: Cell[]): Cell[] {
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of cells) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
  }
  return cells
    .map(([x, y]) => [x - minX, y - minY] as Cell)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export const shapeKey = (cells: Cell[]): string =>
  normalize(cells)
    .map(([x, y]) => `${x},${y}`)
    .join(';');

function parse(shape: string): Cell[] {
  const cells: Cell[] = [];
  shape.split('|').forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '#') cells.push([x, y]);
    });
  });
  return normalize(cells);
}

export const PIECES: PieceDef[] = RAW.map(([id, name, shape]) => {
  const base = parse(shape);
  return { id, name, size: base.length, base };
});

export const PIECE_MAP: Record<string, PieceDef> = Object.fromEntries(PIECES.map((p) => [p.id, p]));
export const PIECE_IDS: string[] = PIECES.map((p) => p.id);
export const TOTAL_SQUARES = PIECES.reduce((sum, p) => sum + p.size, 0);

/** Flip (mirror on x) first, then rotate clockwise `rotation` quarter turns (screen coords, y down). */
export function transform(cells: Cell[], rotation: number, flip: boolean): Cell[] {
  let out = cells.map(([x, y]) => [flip ? -x : x, y] as Cell);
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) out = out.map(([x, y]) => [-y, x] as Cell);
  return normalize(out);
}

const orientationCache = new Map<string, Cell[][]>();
const orientationKeyCache = new Map<string, Set<string>>();

/** All distinct orientations (rotations + mirror images) of a piece. */
export function orientations(pieceId: string): Cell[][] {
  const cached = orientationCache.get(pieceId);
  if (cached) return cached;
  const piece = PIECE_MAP[pieceId];
  if (!piece) return [];
  const seen = new Set<string>();
  const list: Cell[][] = [];
  for (const flip of [false, true]) {
    for (let r = 0; r < 4; r++) {
      const cells = transform(piece.base, r, flip);
      const key = shapeKey(cells);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(cells);
    }
  }
  orientationCache.set(pieceId, list);
  orientationKeyCache.set(pieceId, seen);
  return list;
}

export function orientationKeys(pieceId: string): Set<string> {
  if (!orientationKeyCache.has(pieceId)) orientations(pieceId);
  return orientationKeyCache.get(pieceId) ?? new Set();
}

/** The cell of a shape closest to its centroid — used to anchor the ghost under the pointer. */
export function handleOf(cells: Cell[]): Cell {
  const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length;
  const cy = cells.reduce((s, c) => s + c[1], 0) / cells.length;
  let best = cells[0];
  let bestD = Infinity;
  for (const c of cells) {
    const d = (c[0] - cx) ** 2 + (c[1] - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
