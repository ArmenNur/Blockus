import { useCallback, useEffect, useReducer } from 'react';
import { chooseBotMove } from '../game/ai';
import { applyMove, createGame, restPlayer } from '../game/engine';
import type { GameState, Placement, PlayerConfig } from '../game/types';

const BOT_DELAY_MS = 700;

interface LocalState {
  state: GameState;
  past: GameState[];
  configs: PlayerConfig[];
}

type Action =
  | { type: 'place'; player: number; placement: Placement }
  | { type: 'bot'; turn: number; gameId: string; placement: Placement | null }
  | { type: 'rest'; player: number }
  | { type: 'undo' }
  | { type: 'restart' };

const humanToMove = (g: GameState) => !g.finished && g.players[g.current].kind === 'human';

function reducer(s: LocalState, a: Action): LocalState {
  try {
    switch (a.type) {
      case 'place':
        return { ...s, past: [...s.past, s.state], state: applyMove(s.state, { ...a.placement, player: a.player }) };
      case 'bot': {
        const g = s.state;
        if (g.id !== a.gameId || g.turn !== a.turn || g.finished || g.players[g.current].kind !== 'bot') return s;
        const next = a.placement ? applyMove(g, { ...a.placement, player: g.current }) : restPlayer(g, g.current);
        return { ...s, past: [...s.past, g], state: next };
      }
      case 'rest':
        return { ...s, past: [...s.past, s.state], state: restPlayer(s.state, a.player) };
      case 'undo': {
        for (let i = s.past.length - 1; i >= 0; i--) {
          if (humanToMove(s.past[i])) return { ...s, state: s.past[i], past: s.past.slice(0, i) };
        }
        return s;
      }
      case 'restart':
        return { ...s, past: [], state: createGame(s.configs) };
    }
  } catch (err) {
    console.warn('[bloomgrid] rejected action', a.type, err);
    return s;
  }
}

export function useLocalGame(configs: PlayerConfig[]) {
  const [{ state, past }, dispatch] = useReducer(reducer, configs, (c) => ({ state: createGame(c), past: [], configs: c }));

  // Drive bots.
  useEffect(() => {
    if (state.finished || state.players[state.current].kind !== 'bot') return;
    const { id, turn, current } = state;
    const t = window.setTimeout(() => {
      const placement = chooseBotMove(state, current, state.players[current].difficulty);
      dispatch({ type: 'bot', gameId: id, turn, placement });
    }, BOT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [state]);

  return {
    state,
    canUndo: past.some(humanToMove),
    place: useCallback((player: number, placement: Placement) => dispatch({ type: 'place', player, placement }), []),
    rest: useCallback((player: number) => dispatch({ type: 'rest', player }), []),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    restart: useCallback(() => dispatch({ type: 'restart' }), []),
  };
}
