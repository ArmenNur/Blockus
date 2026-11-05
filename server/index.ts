/**
 * Bloomgrid server — serves the built client and runs in-memory online rooms over Socket.io.
 * No database: rooms live in memory and disappear when idle or on restart.
 */
import express from 'express';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server, type Socket } from 'socket.io';
import { chooseBotMove } from '../src/game/ai';
import { applyMove, createGame, restPlayer } from '../src/game/engine';
import type { Difficulty, GameState, Placement } from '../src/game/types';

const PORT = Number(process.env.PORT) || 4320;
const MAX_SEATS = 4;
const BOT_DELAY_MS = 800;
const RECONNECT_GRACE_MS = 60_000;
const ROOM_IDLE_MS = 30 * 60_000;
const BOT_NAMES = ['Thistle', 'Juniper', 'Sorrel', 'Yarrow', 'Bramblewick', 'Mossy'];

interface Seat {
  kind: 'human' | 'bot';
  name: string;
  difficulty: Difficulty;
  token: string | null;
  socketId: string | null;
  connected: boolean;
  dropTimer?: NodeJS.Timeout;
}

interface Room {
  code: string;
  hostToken: string;
  seats: Seat[];
  game: GameState | null;
  lastActive: number;
  botTimer?: NodeJS.Timeout;
}

type AckResult = { ok: true; [k: string]: unknown } | { ok: false; error: string };
type Ack = (res: AckResult) => void;

const rooms = new Map<string, Room>();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

if (fs.existsSync(dist)) {
  app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '30d', immutable: true }));
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// ---------------------------------------------------------------- helpers

const safeAck = (a: unknown): Ack => (typeof a === 'function' ? (a as Ack) : () => {});
const isDifficulty = (d: unknown): d is Difficulty => d === 'easy' || d === 'normal' || d === 'hard';
const cleanName = (n: unknown) =>
  String(n ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16) || 'Gardener';

function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}

const hostSeatOf = (room: Room) => room.seats.findIndex((s) => s.token === room.hostToken);

function broadcast(room: Room) {
  room.lastActive = Date.now();
  const hostSeat = hostSeatOf(room);
  const seats = room.seats.map((s, i) => ({
    kind: s.kind,
    name: s.name,
    difficulty: s.difficulty,
    connected: s.kind === 'bot' || s.connected,
    isHost: i === hostSeat,
  }));
  room.seats.forEach((s, i) => {
    if (!s.socketId) return;
    io.to(s.socketId).emit('room', {
      room: { code: room.code, seats, started: !!room.game, you: i, hostSeat },
      game: room.game,
    });
  });
}

function destroyRoom(room: Room) {
  clearTimeout(room.botTimer);
  room.seats.forEach((s) => clearTimeout(s.dropTimer));
  rooms.delete(room.code);
}

function scheduleBot(room: Room) {
  clearTimeout(room.botTimer);
  const g = room.game;
  if (!g || g.finished || g.players[g.current].kind !== 'bot') return;
  room.botTimer = setTimeout(() => {
    const game = room.game;
    if (!game || game.finished || game.id !== g.id || game.turn !== g.turn) return;
    const seat = game.current;
    const player = game.players[seat];
    if (player.kind !== 'bot') return;
    try {
      const move = chooseBotMove(game, seat, player.difficulty);
      room.game = move ? applyMove(game, { ...move, player: seat }) : restPlayer(game, seat);
    } catch (err) {
      console.error('[bot]', err);
      room.game = restPlayer(game, seat);
    }
    broadcast(room);
    scheduleBot(room);
  }, BOT_DELAY_MS);
}

function convertToBot(room: Room, index: number) {
  const seat = room.seats[index];
  if (!seat) return;
  clearTimeout(seat.dropTimer);
  if (seat.token === room.hostToken) room.hostToken = '';
  seat.kind = 'bot';
  seat.token = null;
  seat.socketId = null;
  seat.connected = true;
  seat.difficulty = 'normal';
  if (room.game) {
    room.game = {
      ...room.game,
      players: room.game.players.map((p, i) => (i === index ? { ...p, kind: 'bot', difficulty: 'normal' } : p)),
    };
  }
}

/** Ensures a host exists; deletes the room when no humans are left. Returns false if the room was deleted. */
function settleHost(room: Room): boolean {
  const humans = room.seats.filter((s) => s.kind === 'human' && s.token);
  if (humans.length === 0) {
    destroyRoom(room);
    return false;
  }
  if (!humans.some((s) => s.token === room.hostToken)) {
    room.hostToken = (humans.find((s) => s.connected) ?? humans[0]).token!;
  }
  return true;
}

function dropSeat(room: Room, index: number) {
  if (index < 0 || !rooms.has(room.code)) return;
  if (room.game) convertToBot(room, index);
  else {
    clearTimeout(room.seats[index].dropTimer);
    if (room.seats[index].token === room.hostToken) room.hostToken = '';
    room.seats.splice(index, 1);
  }
  if (!settleHost(room)) return;
  broadcast(room);
  scheduleBot(room);
}

function context(socket: Socket) {
  const { code, token } = (socket.data ?? {}) as { code?: string; token?: string };
  const room = code ? rooms.get(code) : undefined;
  if (!room || !token) return null;
  const seat = room.seats.findIndex((s) => s.token === token);
  if (seat < 0) return null;
  return { room, seat, isHost: room.hostToken === token };
}

function leaveCurrent(socket: Socket, explicit: boolean) {
  const { code, token } = (socket.data ?? {}) as { code?: string; token?: string };
  socket.data = {};
  if (!code) return;
  socket.leave(code);
  const room = rooms.get(code);
  if (!room) return;
  const index = room.seats.findIndex((s) => s.token === token);
  if (index < 0) return;
  const seat = room.seats[index];
  if (!explicit && seat.socketId !== socket.id) return; // a newer tab took over this seat
  seat.socketId = null;
  seat.connected = false;
  if (explicit) {
    dropSeat(room, index);
    return;
  }
  clearTimeout(seat.dropTimer);
  seat.dropTimer = setTimeout(() => {
    if (!seat.connected) dropSeat(room, room.seats.indexOf(seat));
  }, RECONNECT_GRACE_MS);
  broadcast(room);
}

// ---------------------------------------------------------------- sockets

io.on('connection', (socket) => {
  socket.on('create', (payload: { name?: string } | undefined, ack: unknown) => {
    const done = safeAck(ack);
    leaveCurrent(socket, true);
    const token = randomUUID();
    const code = makeCode();
    const room: Room = {
      code,
      hostToken: token,
      seats: [{ kind: 'human', name: cleanName(payload?.name), difficulty: 'normal', token, socketId: socket.id, connected: true }],
      game: null,
      lastActive: Date.now(),
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data = { code, token };
    done({ ok: true, code, token });
    broadcast(room);
  });

  socket.on('join', (payload: { code?: string; name?: string; token?: string } | undefined, ack: unknown) => {
    const done = safeAck(ack);
    const code = String(payload?.code ?? '')
      .toUpperCase()
      .trim();
    const room = rooms.get(code);
    if (!room) return done({ ok: false, error: 'Room not found — check the code.' });

    const token = typeof payload?.token === 'string' ? payload.token : null;
    let index = token ? room.seats.findIndex((s) => s.token === token) : -1;

    if ((socket.data as { code?: string })?.code && (socket.data as { code?: string }).code !== code) {
      leaveCurrent(socket, true);
    }

    if (index >= 0) {
      const seat = room.seats[index];
      clearTimeout(seat.dropTimer);
      seat.socketId = socket.id;
      seat.connected = true;
    } else {
      if (room.game) return done({ ok: false, error: 'That game has already started.' });
      if (room.seats.length >= MAX_SEATS) return done({ ok: false, error: 'That room is full.' });
      room.seats.push({
        kind: 'human',
        name: cleanName(payload?.name),
        difficulty: 'normal',
        token: randomUUID(),
        socketId: socket.id,
        connected: true,
      });
      index = room.seats.length - 1;
    }
    const seat = room.seats[index];
    socket.join(code);
    socket.data = { code, token: seat.token };
    done({ ok: true, code, token: seat.token });
    broadcast(room);
    scheduleBot(room);
  });

  const hostAction = (name: string, fn: (room: Room, payload: Record<string, unknown>, done: Ack) => void) => {
    socket.on(name, (payload: Record<string, unknown> | undefined, ack: unknown) => {
      const done = safeAck(ack);
      const ctx = context(socket);
      if (!ctx) return done({ ok: false, error: 'You are not in a room.' });
      if (!ctx.isHost) return done({ ok: false, error: 'Only the host can do that.' });
      fn(ctx.room, payload ?? {}, done);
    });
  };

  hostAction('addBot', (room, payload, done) => {
    if (room.game) return done({ ok: false, error: 'The game has already started.' });
    if (room.seats.length >= MAX_SEATS) return done({ ok: false, error: 'The room is full.' });
    const used = new Set(room.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${room.seats.length + 1}`;
    room.seats.push({
      kind: 'bot',
      name,
      difficulty: isDifficulty(payload.difficulty) ? payload.difficulty : 'normal',
      token: null,
      socketId: null,
      connected: true,
    });
    done({ ok: true });
    broadcast(room);
  });

  hostAction('removeSeat', (room, payload, done) => {
    const index = Number(payload.seat);
    const seat = room.seats[index];
    if (!seat) return done({ ok: false, error: 'No such seat.' });
    if (room.game) return done({ ok: false, error: 'You cannot remove players mid-game.' });
    if (seat.token === room.hostToken) return done({ ok: false, error: 'You cannot remove yourself.' });
    clearTimeout(seat.dropTimer);
    if (seat.socketId) {
      const target = io.sockets.sockets.get(seat.socketId);
      target?.leave(room.code);
      if (target) target.data = {};
      io.to(seat.socketId).emit('kicked');
    }
    room.seats.splice(index, 1);
    done({ ok: true });
    broadcast(room);
  });

  hostAction('setDifficulty', (room, payload, done) => {
    const index = Number(payload.seat);
    const seat = room.seats[index];
    if (!seat || seat.kind !== 'bot' || !isDifficulty(payload.difficulty)) return done({ ok: false, error: 'Invalid bot.' });
    seat.difficulty = payload.difficulty;
    if (room.game) {
      room.game = {
        ...room.game,
        players: room.game.players.map((p, i) => (i === index ? { ...p, difficulty: seat.difficulty } : p)),
      };
    }
    done({ ok: true });
    broadcast(room);
  });

  const startGame = (room: Room, done: Ack) => {
    if (room.seats.length < 2) return done({ ok: false, error: 'You need at least 2 players.' });
    room.game = createGame(room.seats.map((s) => ({ name: s.name, kind: s.kind, difficulty: s.difficulty })));
    done({ ok: true });
    broadcast(room);
    scheduleBot(room);
  };

  hostAction('start', (room, _payload, done) => {
    if (room.game) return done({ ok: false, error: 'The game has already started.' });
    startGame(room, done);
  });

  hostAction('restart', (room, _payload, done) => startGame(room, done));

  hostAction('toLobby', (room, _payload, done) => {
    clearTimeout(room.botTimer);
    room.game = null;
    done({ ok: true });
    broadcast(room);
  });

  hostAction('replaceWithBot', (room, payload, done) => {
    const index = Number(payload.seat);
    const seat = room.seats[index];
    if (!seat || seat.kind !== 'human' || seat.connected) return done({ ok: false, error: 'Only disconnected players can be replaced.' });
    convertToBot(room, index);
    settleHost(room);
    done({ ok: true });
    broadcast(room);
    scheduleBot(room);
  });

  const playAction = (name: string, fn: (game: GameState, seat: number, payload: Record<string, unknown>) => GameState) => {
    socket.on(name, (payload: Record<string, unknown> | undefined, ack: unknown) => {
      const done = safeAck(ack);
      const ctx = context(socket);
      if (!ctx?.room.game) return done({ ok: false, error: 'No game in progress.' });
      try {
        ctx.room.game = fn(ctx.room.game, ctx.seat, payload ?? {});
      } catch (err) {
        return done({ ok: false, error: err instanceof Error ? err.message : 'Invalid move.' });
      }
      done({ ok: true });
      broadcast(ctx.room);
      scheduleBot(ctx.room);
    });
  };

  playAction('place', (game, seat, payload) => {
    const placement = payload as unknown as Placement;
    return applyMove(game, { pieceId: String(placement.pieceId), cells: placement.cells, player: seat });
  });

  playAction('rest', (game, seat) => restPlayer(game, seat));

  socket.on('leave', (_payload: unknown, ack: unknown) => {
    leaveCurrent(socket, true);
    safeAck(ack)({ ok: true });
  });

  socket.on('disconnect', () => leaveCurrent(socket, false));
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const anyone = room.seats.some((s) => s.kind === 'human' && s.connected);
    if (!anyone && now - room.lastActive > ROOM_IDLE_MS) destroyRoom(room);
  }
}, 5 * 60_000).unref();

httpServer.listen(PORT, () => {
  console.log(`🌱 Bloomgrid server on http://localhost:${PORT}`);
});
