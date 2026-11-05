export type Cell = [number, number];
export type Difficulty = 'easy' | 'normal' | 'hard';
export type SeatKind = 'human' | 'bot';

export interface PlayerConfig {
  name: string;
  kind: SeatKind;
  difficulty?: Difficulty;
}

export interface PlayerState {
  name: string;
  /** index into PLAYER_COLORS — equals the seat index */
  color: number;
  kind: SeatKind;
  difficulty: Difficulty;
  /** the cell the first piece must cover */
  seedbed: Cell;
  /** ids of pieces not yet planted */
  remaining: string[];
  /** no more turns for this player (no room, rested, or everything planted) */
  out: boolean;
  /** chose to stop voluntarily */
  rested: boolean;
  placedSquares: number;
  allPlaced: boolean;
}

export interface Placement {
  pieceId: string;
  cells: Cell[];
}

export interface Move extends Placement {
  player: number;
}

export type LogEntry =
  | { kind: 'place'; turn: number; player: number; pieceId: string }
  | { kind: 'out'; turn: number; player: number }
  | { kind: 'rest'; turn: number; player: number };

export interface GameState {
  id: string;
  size: number;
  /** size*size, -1 = empty, otherwise the owning player index */
  board: number[];
  players: PlayerState[];
  current: number;
  turn: number;
  finished: boolean;
  lastMove: Move | null;
  log: LogEntry[];
}
