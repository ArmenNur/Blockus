import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bot, Check, Copy, Crown, LogIn, Play, Plus, Trash2, User, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, IconButton, Segmented } from '../components/ui';
import { GameView } from '../components/GameView';
import { boardSizeFor } from '../game/engine';
import type { Difficulty } from '../game/types';
import { useOnline } from '../hooks/useOnline';
import { PLAYER_COLORS } from '../lib/colors';
import { readJSON, writeJSON } from '../lib/storage';

export function OnlineScreen({ initialCode, onExit }: { initialCode?: string; onExit: () => void }) {
  const online = useOnline();
  const { room, game, error, connected, busy } = online;
  const [name, setName] = useState(() => readJSON<string>('bloomgrid.name', ''));
  const [code, setCode] = useState(initialCode ?? '');
  const [copied, setCopied] = useState(false);

  useEffect(() => writeJSON('bloomgrid.name', name), [name]);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(online.clearError, 3500);
    return () => window.clearTimeout(t);
  }, [error, online.clearError]);

  const exit = async () => {
    await online.leave();
    onExit();
  };

  // ---------- in game
  if (room && game) {
    const isHost = room.you === room.hostSeat;
    return (
      <>
        <GameView
          state={game}
          mode="online"
          controllable={[room.you]}
          roomCode={room.code}
          onPlace={(_p, placement) => void online.place(placement)}
          onRest={() => void online.rest()}
          onExit={exit}
          onRestart={isHost ? () => void online.restart() : undefined}
          onToLobby={isHost ? () => void online.toLobby() : undefined}
          away={room.seats.map((s) => !s.connected)}
          onReplaceWithBot={isHost ? (seat) => void online.replaceWithBot(seat) : undefined}
        />
        <ErrorToast error={error} connected={connected} />
      </>
    );
  }

  const copyLink = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?room=${room.code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the code is visible anyway */
    }
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-4 py-6 sm:py-12">
      <div className="mb-6 flex items-center gap-2">
        <IconButton label="Back" onClick={exit}>
          <ArrowLeft size={20} />
        </IconButton>
        <h1 className="font-display text-3xl font-bold">{room ? 'Room lobby' : 'Online room'}</h1>
        <div className="flex-1" />
        <span className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-[#a3f0cf]' : 'text-ink-400'}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-[#33c48a]' : 'bg-ink-500'}`} />
          {connected ? 'Connected' : 'Connecting…'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {!room ? (
          <motion.div key="enter" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col gap-4">
            <Card className="p-5">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink-400" htmlFor="name">
                Your name
              </label>
              <input
                id="name"
                value={name}
                maxLength={16}
                onChange={(e) => setName(e.target.value)}
                placeholder="Gardener"
                className="w-full rounded-xl bg-ink-950/60 px-4 py-3 text-base font-semibold outline-none ring-1 ring-white/5 placeholder:text-ink-500 focus:ring-2 focus:ring-sun/60"
              />
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="flex flex-col p-5">
                <div className="font-display text-xl font-bold">Host a room</div>
                <p className="mb-4 mt-1 flex-1 text-sm text-ink-300">You get a 4-letter code to share. Fill empty seats with bots.</p>
                <Button variant="primary" disabled={!connected || busy} onClick={() => void online.create(name || 'Gardener')}>
                  <Plus size={16} /> Create room
                </Button>
              </Card>
              <Card className="flex flex-col p-5">
                <div className="font-display text-xl font-bold">Join a room</div>
                <form
                  className="mt-3 flex flex-1 flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (code.trim().length === 4) void online.join(code.trim().toUpperCase(), name || 'Gardener');
                  }}
                >
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                    placeholder="ABCD"
                    aria-label="Room code"
                    className="w-full rounded-xl bg-ink-950/60 px-4 py-2.5 text-center font-mono text-xl font-bold uppercase tracking-[0.4em] outline-none ring-1 ring-white/5 placeholder:text-ink-600 focus:ring-2 focus:ring-sun/60"
                  />
                  <Button type="submit" variant="soft" disabled={!connected || busy || code.length !== 4}>
                    <LogIn size={16} /> Join
                  </Button>
                </form>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <Lobby
              room={room}
              copied={copied}
              onCopy={copyLink}
              onAddBot={(d) => void online.addBot(d)}
              onRemove={(s) => void online.removeSeat(s)}
              onDifficulty={(s, d) => void online.setDifficulty(s, d)}
              onStart={() => void online.start()}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorToast error={error} connected={connected} />
    </div>
  );
}

function Lobby({
  room,
  copied,
  onCopy,
  onAddBot,
  onRemove,
  onDifficulty,
  onStart,
}: {
  room: NonNullable<ReturnType<typeof useOnline>['room']>;
  copied: boolean;
  onCopy: () => void;
  onAddBot: (d: Difficulty) => void;
  onRemove: (seat: number) => void;
  onDifficulty: (seat: number, d: Difficulty) => void;
  onStart: () => void;
}) {
  const isHost = room.you === room.hostSeat;
  const n = room.seats.length;
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center p-6 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Room code</div>
        <div className="my-2 font-mono text-5xl font-bold tracking-[0.3em] text-sun">{room.code}</div>
        <Button variant="soft" onClick={onCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Link copied' : 'Copy invite link'}
        </Button>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-xl font-bold">Gardeners</div>
          <div className="text-sm text-ink-300">{n} / 4</div>
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => {
            const s = room.seats[i];
            const c = PLAYER_COLORS[i];
            if (!s) {
              return (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 p-3 text-sm text-ink-400">
                  <div className="h-10 w-10 rounded-xl" style={{ background: `${c.fill}14` }} />
                  <span className="flex-1">Open seat</span>
                  {isHost && i === n && (
                    <Button variant="soft" className="!px-3 !py-1.5 text-xs" onClick={() => onAddBot('normal')}>
                      <Bot size={14} /> Add bot
                    </Button>
                  )}
                </div>
              );
            }
            return (
              <motion.div layout key={i} className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink-900/60 p-3 ring-1 ring-white/[0.05]">
                <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${c.fill}26`, color: c.fill }}>
                  {s.kind === 'bot' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{s.name}</span>
                    {s.isHost && <Crown size={14} className="text-sun" />}
                    {i === room.you && <span className="rounded-md bg-white/10 px-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-200">You</span>}
                  </div>
                  <div className="text-xs text-ink-400">
                    {s.kind === 'bot' ? 'Bot' : s.connected ? c.name : (
                      <span className="inline-flex items-center gap-1 text-[#ffb0b0]">
                        <WifiOff size={11} /> Reconnecting…
                      </span>
                    )}
                  </div>
                </div>
                {s.kind === 'bot' &&
                  (isHost ? (
                    <Segmented<Difficulty>
                      size="sm"
                      value={s.difficulty}
                      onChange={(d) => onDifficulty(i, d)}
                      options={[
                        { value: 'easy', label: 'Easy' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'hard', label: 'Hard' },
                      ]}
                    />
                  ) : (
                    <span className="text-xs capitalize text-ink-300">{s.difficulty}</span>
                  ))}
                {isHost && !s.isHost && (
                  <IconButton label="Remove" className="h-8 w-8" onClick={() => onRemove(i)}>
                    <Trash2 size={16} />
                  </IconButton>
                )}
              </motion.div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="text-sm text-ink-300">
            {n >= 2 ? `${boardSizeFor(n)}×${boardSizeFor(n)} garden` : 'Need at least 2 gardeners'}
          </div>
          {isHost ? (
            <Button variant="primary" disabled={n < 2} onClick={onStart}>
              <Play size={16} /> Start game
            </Button>
          ) : (
            <span className="text-sm text-ink-400">Waiting for the host to start…</span>
          )}
        </div>
      </Card>
    </div>
  );
}

function ErrorToast({ error, connected }: { error: string | null; connected: boolean }) {
  const msg = error ?? (!connected ? 'Connection lost — reconnecting…' : null);
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-5 left-1/2 z-50 max-w-[92vw] rounded-xl bg-ink-950/95 px-4 py-2.5 text-sm font-medium text-[#ffb0b0] shadow-card ring-1 ring-[#ff6b6b]/30"
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
