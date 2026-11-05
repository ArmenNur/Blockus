import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bot, Play, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { boardSizeFor } from '../game/engine';
import type { Difficulty, PlayerConfig, SeatKind } from '../game/types';
import { PLAYER_COLORS } from '../lib/colors';
import { readJSON, writeJSON } from '../lib/storage';
import { Button, Card, IconButton, Segmented } from '../components/ui';

const KEY = 'bloomgrid.localSetup';
const DEFAULT: PlayerConfig[] = [
  { name: 'You', kind: 'human', difficulty: 'normal' },
  { name: 'Thistle', kind: 'bot', difficulty: 'normal' },
];
const BOT_NAMES = ['Thistle', 'Juniper', 'Sorrel', 'Yarrow'];

function loadConfigs(): PlayerConfig[] {
  const saved = readJSON<PlayerConfig[] | null>(KEY, null);
  if (!Array.isArray(saved) || saved.length < 2 || saved.length > 4) return DEFAULT;
  return saved.map((s) => ({
    name: String(s.name ?? '').slice(0, 16),
    kind: s.kind === 'bot' ? 'bot' : 'human',
    difficulty: s.difficulty === 'easy' || s.difficulty === 'hard' ? s.difficulty : 'normal',
  }));
}

export function LocalSetup({ onBack, onStart }: { onBack: () => void; onStart: (configs: PlayerConfig[]) => void }) {
  const [seats, setSeats] = useState<PlayerConfig[]>(loadConfigs);
  const size = boardSizeFor(seats.length);

  const update = (i: number, patch: Partial<PlayerConfig>) => setSeats((s) => s.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const setKind = (i: number, kind: SeatKind) => {
    const p = seats[i];
    const name =
      kind === 'bot' && (!p.name || p.name === 'You' || p.name.startsWith('Player'))
        ? BOT_NAMES[i]
        : kind === 'human' && BOT_NAMES.includes(p.name)
          ? i === 0
            ? 'You'
            : `Player ${i + 1}`
          : p.name;
    update(i, { kind, name });
  };

  const start = () => {
    const cleaned = seats.map((s, i) => ({ ...s, name: s.name.trim() || (s.kind === 'bot' ? BOT_NAMES[i] : `Player ${i + 1}`) }));
    writeJSON(KEY, cleaned);
    onStart(cleaned);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-4 py-6 sm:py-12">
      <div className="mb-6 flex items-center gap-2">
        <IconButton label="Back" onClick={onBack}>
          <ArrowLeft size={20} />
        </IconButton>
        <h1 className="font-display text-3xl font-bold">Local game</h1>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {seats.map((s, i) => {
              const c = PLAYER_COLORS[i];
              return (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-ink-900/60 p-3 ring-1 ring-white/[0.05]">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${c.fill}26`, color: c.fill }}>
                      {s.kind === 'bot' ? <Bot size={20} /> : <User size={20} />}
                    </div>
                    <input
                      value={s.name}
                      maxLength={16}
                      onChange={(e) => update(i, { name: e.target.value })}
                      aria-label={`Seat ${i + 1} name`}
                      placeholder={c.name}
                      className="min-w-0 flex-1 rounded-xl bg-ink-950/60 px-3 py-2 text-sm font-semibold text-ink-100 outline-none ring-1 ring-white/5 placeholder:text-ink-500 focus:ring-2 focus:ring-sun/60"
                    />
                    <Segmented<SeatKind>
                      value={s.kind}
                      onChange={(k) => setKind(i, k)}
                      size="sm"
                      options={[
                        { value: 'human', label: 'Human' },
                        { value: 'bot', label: 'Bot' },
                      ]}
                    />
                    {seats.length > 2 && (
                      <IconButton label="Remove seat" className="h-8 w-8" onClick={() => setSeats((all) => all.filter((_, j) => j !== i))}>
                        <Trash2 size={16} />
                      </IconButton>
                    )}
                    <AnimatePresence initial={false}>
                      {s.kind === 'bot' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex w-full items-center gap-2 overflow-hidden pl-12"
                        >
                          <span className="text-xs text-ink-400">Skill</span>
                          <Segmented<Difficulty>
                            value={s.difficulty ?? 'normal'}
                            onChange={(d) => update(i, { difficulty: d })}
                            size="sm"
                            options={[
                              { value: 'easy', label: 'Easy' },
                              { value: 'normal', label: 'Normal' },
                              { value: 'hard', label: 'Hard' },
                            ]}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {seats.length < 4 && (
            <button
              onClick={() => setSeats((all) => [...all, { name: BOT_NAMES[all.length], kind: 'bot', difficulty: 'normal' }])}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-sm font-semibold text-ink-300 transition hover:border-white/30 hover:text-ink-100"
            >
              <Plus size={16} /> Add a gardener
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="text-sm text-ink-300">
            {seats.length} players · {size}×{size} garden
          </div>
          <Button variant="primary" onClick={start}>
            <Play size={16} /> Start planting
          </Button>
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-ink-400">
        With more than one human, pass the device when the banner calls the next gardener.
      </p>
    </div>
  );
}
