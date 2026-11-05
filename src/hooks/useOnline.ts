import { useCallback, useEffect, useState } from 'react';
import type { Difficulty, GameState, Placement } from '../game/types';
import { getSocket } from '../lib/socket';
import { readJSON, removeKey, writeJSON } from '../lib/storage';

export interface PublicSeat {
  kind: 'human' | 'bot';
  name: string;
  difficulty: Difficulty;
  connected: boolean;
  isHost: boolean;
}

export interface RoomView {
  code: string;
  seats: PublicSeat[];
  started: boolean;
  you: number;
  hostSeat: number;
}

interface Session {
  code: string;
  token: string;
  name: string;
}

type Res = { ok: true; code?: string; token?: string } | { ok: false; error: string };

const SESSION_KEY = 'bloomgrid.session';

export function useOnline() {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const onRoom = (payload: { room: RoomView; game: GameState | null }) => {
      setRoom(payload.room);
      setGame(payload.game);
    };
    const onConnect = () => {
      setConnected(true);
      const session = readJSON<Session | null>(SESSION_KEY, null, 'session');
      if (session) {
        s.emit('join', session, (res: Res) => {
          if (!res.ok) {
            removeKey(SESSION_KEY, 'session');
            setRoom(null);
            setGame(null);
          }
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onKicked = () => {
      removeKey(SESSION_KEY, 'session');
      setRoom(null);
      setGame(null);
      setError('The host removed you from the room.');
    };
    s.on('room', onRoom);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('kicked', onKicked);
    if (s.connected) onConnect();
    return () => {
      s.off('room', onRoom);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('kicked', onKicked);
    };
  }, []);

  const call = useCallback((event: string, payload?: unknown) => {
    return new Promise<Res>((resolve) => {
      const s = getSocket();
      if (!s.connected) {
        const res: Res = { ok: false, error: 'Not connected to the server yet.' };
        setError(res.error);
        resolve(res);
        return;
      }
      s.timeout(8000).emit(event, payload ?? {}, (err: Error | null, res: Res) => {
        const out: Res = err ? { ok: false, error: 'The server did not respond.' } : res;
        if (!out.ok) setError(out.error);
        resolve(out);
      });
    });
  }, []);

  const enter = useCallback(
    async (event: 'create' | 'join', name: string, code?: string) => {
      setBusy(true);
      setError(null);
      const res = await call(event, { name, code });
      setBusy(false);
      if (res.ok && res.code && res.token) writeJSON(SESSION_KEY, { code: res.code, token: res.token, name }, 'session');
      return res.ok;
    },
    [call],
  );

  return {
    room,
    game,
    error,
    connected,
    busy,
    clearError: useCallback(() => setError(null), []),
    create: useCallback((name: string) => enter('create', name), [enter]),
    join: useCallback((code: string, name: string) => enter('join', name, code), [enter]),
    addBot: useCallback((difficulty: Difficulty) => call('addBot', { difficulty }), [call]),
    removeSeat: useCallback((seat: number) => call('removeSeat', { seat }), [call]),
    setDifficulty: useCallback((seat: number, difficulty: Difficulty) => call('setDifficulty', { seat, difficulty }), [call]),
    start: useCallback(() => call('start'), [call]),
    restart: useCallback(() => call('restart'), [call]),
    toLobby: useCallback(() => call('toLobby'), [call]),
    replaceWithBot: useCallback((seat: number) => call('replaceWithBot', { seat }), [call]),
    place: useCallback((placement: Placement) => call('place', placement), [call]),
    rest: useCallback(() => call('rest'), [call]),
    leave: useCallback(async () => {
      removeKey(SESSION_KEY, 'session');
      setRoom(null);
      setGame(null);
      const s = getSocket();
      if (s.connected) await new Promise<void>((r) => s.timeout(3000).emit('leave', {}, () => r()));
    }, []),
  };
}
