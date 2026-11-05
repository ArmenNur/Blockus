import { PIECE_IDS, PIECE_MAP, TOTAL_SQUARES, orientationKeys, orientations, shapeKey } from './pieces';
import type { Cell, GameState, LogEntry, Move, Placement, PlayerConfig, PlayerState } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const FULL_BLOOM_BONUS = 10;

const EDGE: Cell[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAG: Cell[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function boardSizeFor(players: number): number {
  if (players <= 2) return 14;
  if (players === 3) return 17;
  return 20;
}

export function seedbedsFor(size: number, count: number): Cell[] {
  const m = size - 1;
  if (count <= 2) return [
    [0, 0],
    [m, m],
  ];
  const corners: Cell[] = [
    [0, 0],
    [m, 0],
    [m, m],
    [0, m],
  ];
  return corners.slice(0, count);
}

let gameCounter = 0;

export function createGame(configs: PlayerConfig[], id?: string): GameState {
  if (configs.length < MIN_PLAYERS || configs.length > MAX_PLAYERS) {
    throw new Error(`Bloomgrid needs ${MIN_PLAYERS}–${MAX_PLAYERS} players.`);
  }
  const size = boardSizeFor(configs.length);
  const beds = seedbedsFor(size, configs.length);
  return {
    id: id ?? `g${Date.now().toString(36)}${(gameCounter++).toString(36)}`,
    size,
    board: new Array(size * size).fill(-1),
    players: configs.map<PlayerState>((c, i) => ({
      name: c.name.trim() || `Player ${i + 1}`,
      color: i,
      kind: c.kind,
      difficulty: c.difficulty ?? 'normal',
      seedbed: beds[i],
      remaining: [...PIECE_IDS],
      out: false,
      rested: false,
      placedSquares: 0,
      allPlaced: false,
    })),
    current: 0,
    turn: 1,
    finished: false,
    lastMove: null,
    log: [],
  };
}

const inside = (size: number, x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size;

function touchesOwnEdge(board: number[], size: number, x: number, y: number, player: number): boolean {
  for (const [dx, dy] of EDGE) {
    const nx = x + dx;
    const ny = y + dy;
    if (inside(size, nx, ny) && board[ny * size + nx] === player) return true;
  }
  return false;
}

function touchesOwnCorner(board: number[], size: number, x: number, y: number, player: number): boolean {
  for (const [dx, dy] of DIAG) {
    const nx = x + dx;
    const ny = y + dy;
    if (inside(size, nx, ny) && board[ny * size + nx] === player) return true;
  }
  return false;
}

export const isOpening = (p: PlayerState) => p.remaining.length === PIECE_IDS.length;

/** Returns null when the placement is legal, otherwise a human-readable reason. */
export function validatePlacement(state: GameState, player: number, placement: Placement): string | null {
  if (state.finished) return 'The game is over.';
  const p = state.players[player];
  if (!p) return 'Unknown player.';
  if (p.out) return 'You have already finished.';
  const piece = PIECE_MAP[placement.pieceId];
  if (!piece) return 'Unknown piece.';
  if (!p.remaining.includes(piece.id)) return 'That piece is already planted.';
  const cells = placement.cells;
  if (!Array.isArray(cells) || cells.length !== piece.size) return 'That shape does not match the piece.';
  for (const c of cells) {
    if (!Array.isArray(c) || c.length !== 2 || !Number.isInteger(c[0]) || !Number.isInteger(c[1])) {
      return 'That shape does not match the piece.';
    }
  }
  if (!orientationKeys(piece.id).has(shapeKey(cells))) return 'That shape does not match the piece.';

  const { size, board } = state;
  for (const [x, y] of cells) {
    if (!inside(size, x, y)) return 'The piece hangs off the board.';
    if (board[y * size + x] !== -1) return 'That spot is already taken.';
    if (touchesOwnEdge(board, size, x, y, player)) return 'Your pieces may not share an edge.';
  }
  if (isOpening(p)) {
    const [sx, sy] = p.seedbed;
    if (!cells.some(([x, y]) => x === sx && y === sy)) return 'Your first piece must cover your seedbed.';
  } else if (!cells.some(([x, y]) => touchesOwnCorner(board, size, x, y, player))) {
    return 'Touch one of your pieces corner-to-corner.';
  }
  return null;
}

/** Empty cells where this player could legally grow (corner-adjacent, no own edge contact). */
export function anchorsFor(state: GameState, player: number): number[] {
  const p = state.players[player];
  if (!p || p.out) return [];
  const { size, board } = state;
  if (isOpening(p)) {
    const i = p.seedbed[1] * size + p.seedbed[0];
    return board[i] === -1 ? [i] : [];
  }
  const out = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== player) continue;
    const x = i % size;
    const y = (i - x) / size;
    for (const [dx, dy] of DIAG) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inside(size, nx, ny)) continue;
      const j = ny * size + nx;
      if (board[j] !== -1 || touchesOwnEdge(board, size, nx, ny, player)) continue;
      out.add(j);
    }
  }
  return [...out];
}

/** Every distinct legal placement (optionally stopping after `max`). */
export function listMoves(state: GameState, player: number, max = Infinity): Placement[] {
  const p = state.players[player];
  if (!p || p.out || state.finished) return [];
  const { size, board } = state;
  const result: Placement[] = [];
  const seen = new Set<string>();
  for (const anchor of anchorsFor(state, player)) {
    const ax = anchor % size;
    const ay = (anchor - ax) / size;
    for (const pieceId of p.remaining) {
      for (const shape of orientations(pieceId)) {
        for (const [cx, cy] of shape) {
          const ox = ax - cx;
          const oy = ay - cy;
          const idxs: number[] = [];
          let ok = true;
          for (const [sx, sy] of shape) {
            const x = sx + ox;
            const y = sy + oy;
            if (!inside(size, x, y)) {
              ok = false;
              break;
            }
            const i = y * size + x;
            if (board[i] !== -1 || touchesOwnEdge(board, size, x, y, player)) {
              ok = false;
              break;
            }
            idxs.push(i);
          }
          if (!ok) continue;
          const key = `${pieceId}:${idxs.sort((m, n) => m - n).join(',')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({ pieceId, cells: shape.map(([sx, sy]) => [sx + ox, sy + oy] as Cell) });
          if (result.length >= max) return result;
        }
      }
    }
  }
  return result;
}

export const hasAnyMove = (state: GameState, player: number) => listMoves(state, player, 1).length > 0;

/** Moves to the next player who can still grow; players with no room are marked out. */
function advance(state: GameState): GameState {
  const n = state.players.length;
  let players = state.players;
  const log: LogEntry[] = [...state.log];
  for (let k = 1; k <= n; k++) {
    const i = (state.current + k) % n;
    if (players[i].out) continue;
    if (hasAnyMove({ ...state, players }, i)) {
      return { ...state, players, log, current: i, turn: state.turn + 1 };
    }
    players = players.map((q, j) => (j === i ? { ...q, out: true } : q));
    log.push({ kind: 'out', turn: state.turn, player: i });
  }
  return { ...state, players, log, finished: true };
}

export function applyMove(state: GameState, move: Move): GameState {
  if (state.finished) throw new Error('The game is over.');
  if (move.player !== state.current) throw new Error('It is not your turn.');
  const err = validatePlacement(state, move.player, move);
  if (err) throw new Error(err);

  const board = state.board.slice();
  for (const [x, y] of move.cells) board[y * state.size + x] = move.player;
  const players = state.players.map((p, i) => {
    if (i !== move.player) return p;
    const remaining = p.remaining.filter((id) => id !== move.pieceId);
    const done = remaining.length === 0;
    return {
      ...p,
      remaining,
      placedSquares: p.placedSquares + move.cells.length,
      allPlaced: done,
      out: done ? true : p.out,
    };
  });
  return advance({
    ...state,
    board,
    players,
    lastMove: { player: move.player, pieceId: move.pieceId, cells: move.cells.map(([x, y]) => [x, y] as Cell) },
    log: [...state.log, { kind: 'place', turn: state.turn, player: move.player, pieceId: move.pieceId }],
  });
}

/** The current player voluntarily stops planting for the rest of the game. */
export function restPlayer(state: GameState, player: number): GameState {
  if (state.finished) throw new Error('The game is over.');
  if (player !== state.current) throw new Error('It is not your turn.');
  const players = state.players.map((p, i) => (i === player ? { ...p, out: true, rested: true } : p));
  return advance({ ...state, players, log: [...state.log, { kind: 'rest', turn: state.turn, player }] });
}

export interface ScoreLine {
  player: number;
  squares: number;
  bonus: number;
  total: number;
  remainingSquares: number;
  rank: number;
}

export function scoreOf(p: PlayerState): number {
  return p.placedSquares + (p.allPlaced ? FULL_BLOOM_BONUS : 0);
}

export function standings(state: GameState): ScoreLine[] {
  const lines = state.players.map<ScoreLine>((p, i) => ({
    player: i,
    squares: p.placedSquares,
    bonus: p.allPlaced ? FULL_BLOOM_BONUS : 0,
    total: scoreOf(p),
    remainingSquares: TOTAL_SQUARES - p.placedSquares,
    rank: 0,
  }));
  lines.sort((a, b) => b.total - a.total || a.remainingSquares - b.remainingSquares || a.player - b.player);
  lines.forEach((l, i) => {
    l.rank = i > 0 && lines[i - 1].total === l.total ? lines[i - 1].rank : i + 1;
  });
  return lines;
}
