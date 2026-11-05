import { describe, expect, it } from 'vitest';
import { chooseBotMove } from '../src/game/ai';
import {
  applyMove,
  anchorsFor,
  boardSizeFor,
  createGame,
  listMoves,
  restPlayer,
  standings,
  validatePlacement,
} from '../src/game/engine';
import { PIECES, TOTAL_SQUARES, orientations, transform, shapeKey, PIECE_MAP } from '../src/game/pieces';
import type { Cell, Difficulty, GameState } from '../src/game/types';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const two = () =>
  createGame([
    { name: 'A', kind: 'human' },
    { name: 'B', kind: 'human' },
  ]);

describe('pieces', () => {
  it('has 18 pieces and 74 squares', () => {
    expect(PIECES).toHaveLength(18);
    expect(TOTAL_SQUARES).toBe(74);
  });

  it('computes distinct orientations', () => {
    const counts = Object.fromEntries(PIECES.map((p) => [p.id, orientations(p.id).length]));
    expect(counts).toEqual({
      seed: 1,
      sprout: 2,
      stem: 2,
      bud: 4,
      reed: 2,
      pebble: 1,
      thorn: 4,
      crook: 8,
      vine: 4,
      hook: 8,
      creeper: 8,
      bloom: 8,
      trellis: 4,
      cup: 4,
      elbow: 4,
      terrace: 4,
      clover: 1,
      bramble: 4,
    });
  });

  it('rotates clockwise in screen space', () => {
    // horizontal stem rotated once becomes vertical
    expect(transform(PIECE_MAP.stem.base, 1, false)).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
    // four rotations return to the start
    expect(shapeKey(transform(PIECE_MAP.hook.base, 4, true))).toBe(shapeKey(transform(PIECE_MAP.hook.base, 0, true)));
  });
});

describe('board', () => {
  it('scales with player count', () => {
    expect(boardSizeFor(2)).toBe(14);
    expect(boardSizeFor(3)).toBe(17);
    expect(boardSizeFor(4)).toBe(20);
  });

});

describe('rules', () => {
  it('requires the first piece to cover the seedbed', () => {
    const g = two();
    expect(validatePlacement(g, 0, { pieceId: 'seed', cells: [[1, 1]] })).toMatch(/seedbed/);
    expect(validatePlacement(g, 0, { pieceId: 'seed', cells: [[0, 0]] })).toBeNull();
    expect(anchorsFor(g, 1)).toEqual([13 * 14 + 13]);
  });

  it('rejects shape mismatches and off-board cells', () => {
    const g = two();
    expect(validatePlacement(g, 0, { pieceId: 'sprout', cells: [[0, 0], [1, 1]] })).toMatch(/shape/);
    expect(validatePlacement(g, 0, { pieceId: 'sprout', cells: [[-1, 0], [0, 0]] })).toMatch(/off the board/);
    expect(validatePlacement(g, 0, { pieceId: 'nope', cells: [[0, 0]] })).toMatch(/Unknown/);
  });

  it('enforces corner contact and forbids own edge contact', () => {
    let g = two();
    g = applyMove(g, { player: 0, pieceId: 'pebble', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] });
    g = applyMove(g, { player: 1, pieceId: 'seed', cells: [[13, 13]] });
    // edge contact with own pebble
    expect(validatePlacement(g, 0, { pieceId: 'seed', cells: [[2, 0]] })).toMatch(/edge/);
    // floating, no contact
    expect(validatePlacement(g, 0, { pieceId: 'seed', cells: [[5, 5]] })).toMatch(/corner/);
    // diagonal contact
    expect(validatePlacement(g, 0, { pieceId: 'seed', cells: [[2, 2]] })).toBeNull();
    // already planted piece
    expect(validatePlacement(g, 0, { pieceId: 'pebble', cells: [[2, 2], [3, 2], [2, 3], [3, 3]] })).toMatch(/already planted/);
  });

  it('may touch opponents on edges', () => {
    let g = two();
    g = applyMove(g, { player: 0, pieceId: 'seed', cells: [[0, 0]] });
    g = applyMove(g, { player: 1, pieceId: 'seed', cells: [[13, 13]] });
    g = applyMove(g, { player: 0, pieceId: 'sprout', cells: [[1, 1], [2, 1]] });
    // put a fake opponent cell next to player 0 and check it does not matter
    g = { ...g, board: g.board.map((v, i) => (i === 1 * 14 + 3 ? 1 : v)) };
    expect(validatePlacement(g, 1, { pieceId: 'sprout', cells: [[12, 12], [11, 12]] })).toBeNull();
    g = applyMove(g, { player: 1, pieceId: 'sprout', cells: [[12, 12], [11, 12]] });
    expect(validatePlacement(g, 0, { pieceId: 'stem', cells: [[3, 2], [4, 2], [5, 2]] })).toBeNull(); // edge-touches the opponent cell at (3,1)
  });

  it('only allows the current player to move', () => {
    const g = two();
    expect(() => applyMove(g, { player: 1, pieceId: 'seed', cells: [[13, 13]] })).toThrow(/turn/);
  });

  it('every listed move validates', () => {
    let g = two();
    g = applyMove(g, { player: 0, pieceId: 'terrace', cells: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]] });
    const moves = listMoves(g, 1);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) expect(validatePlacement(g, 1, m)).toBeNull();
    // opening on the corner: clover cannot cover (0,0)
    expect(moves.some((m) => m.pieceId === 'clover')).toBe(false);
  });

  it('resting skips the player and ends the game when everyone is out', () => {
    let g = two();
    g = restPlayer(g, 0);
    expect(g.players[0].out).toBe(true);
    expect(g.current).toBe(1);
    g = restPlayer(g, 1);
    expect(g.finished).toBe(true);
  });
});

function playOut(players: number, difficulties: Difficulty[], seed: number): GameState {
  let g = createGame(
    Array.from({ length: players }, (_, i) => ({ name: `Bot ${i}`, kind: 'bot' as const, difficulty: difficulties[i % difficulties.length] })),
  );
  const rand = seeded(seed);
  let guard = 0;
  while (!g.finished) {
    if (guard++ > 200) throw new Error('game did not terminate');
    const m = chooseBotMove(g, g.current, g.players[g.current].difficulty, rand);
    g = m ? applyMove(g, { ...m, player: g.current }) : restPlayer(g, g.current);
  }
  return g;
}

describe('full games', () => {
  for (const n of [2, 3, 4]) {
    it(`plays a full ${n}-player bot game consistently`, () => {
      const g = playOut(n, ['easy', 'normal', 'hard'], n * 7);
      expect(g.finished).toBe(true);
      g.players.forEach((p, i) => {
        const owned = g.board.filter((v) => v === i).length;
        expect(owned).toBe(p.placedSquares);
        expect(p.out).toBe(true);
      });
      const table = standings(g);
      expect(table[0].rank).toBe(1);
      expect(table.map((l) => l.total)).toEqual([...table.map((l) => l.total)].sort((a, b) => b - a));
    });
  }

  it('hard bots beat easy bots most of the time', () => {
    let hardWins = 0;
    for (let s = 1; s <= 6; s++) {
      const g = playOut(2, s % 2 ? ['hard', 'easy'] : ['easy', 'hard'], s);
      const hardSeat = s % 2 ? 0 : 1;
      if (standings(g)[0].player === hardSeat) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(4);
  });
});

export type { Cell };
