import { anchorsFor, listMoves } from './engine';
import { PIECE_IDS, PIECE_MAP } from './pieces';
import type { Difficulty, GameState, Placement } from './types';

const EDGE = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
const DIAG = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

/**
 * Bot brains.
 *  easy   — random legal move, slightly favouring big pieces
 *  normal — greedy: size, own mobility, centre pull early, with noise
 *  hard   — greedy plus blocking opponents' growth points, almost no noise
 */
export function chooseBotMove(
  state: GameState,
  player: number,
  difficulty: Difficulty,
  rand: () => number = Math.random,
): Placement | null {
  const moves = listMoves(state, player);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    const weights = moves.map((m) => PIECE_MAP[m.pieceId].size ** 1.5);
    let r = rand() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < moves.length; i++) {
      r -= weights[i];
      if (r <= 0) return moves[i];
    }
    return moves[moves.length - 1];
  }

  const hard = difficulty === 'hard';
  const { size, board } = state;
  const myAnchors = anchorsFor(state, player);
  const oppAnchors = new Map<number, number>();
  if (hard) {
    state.players.forEach((p, i) => {
      if (i === player || p.out) return;
      for (const a of anchorsFor(state, i)) oppAnchors.set(a, (oppAnchors.get(a) ?? 0) + 1);
    });
  }
  const p = state.players[player];
  const early = PIECE_IDS.length - p.remaining.length < 4;
  const center = (size - 1) / 2;

  let best: Placement = moves[0];
  let bestScore = -Infinity;

  for (const m of moves) {
    const placed = new Set(m.cells.map(([x, y]) => y * size + x));
    const ownEdgeAfter = (x: number, y: number) => {
      for (const [dx, dy] of EDGE) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const j = ny * size + nx;
        if (board[j] === player || placed.has(j)) return true;
      }
      return false;
    };

    const after = new Set<number>();
    for (const a of myAnchors) {
      if (placed.has(a)) continue;
      const ax = a % size;
      if (!ownEdgeAfter(ax, (a - ax) / size)) after.add(a);
    }
    let block = 0;
    let sx = 0;
    let sy = 0;
    for (const [x, y] of m.cells) {
      const i = y * size + x;
      block += oppAnchors.get(i) ?? 0;
      sx += x;
      sy += y;
      for (const [dx, dy] of DIAG) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const j = ny * size + nx;
        if (board[j] !== -1 || placed.has(j) || ownEdgeAfter(nx, ny)) continue;
        after.add(j);
      }
    }
    const n = m.cells.length;
    const dist = Math.hypot(sx / n - center, sy / n - center) / size;

    let score =
      n * (hard ? 5 : 4) + after.size * (hard ? 1.4 : 1) + block * 3 - dist * (early ? 18 : 4);
    score += rand() * (hard ? 0.5 : 4);

    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
