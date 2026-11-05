import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Copy,
  Lightbulb,
  Menu,
  Moon,
  RefreshCcw,
  Trophy,
  Undo2,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chooseBotMove } from '../game/ai';
import { anchorsFor, listMoves, validatePlacement } from '../game/engine';
import { PIECE_MAP, handleOf, shapeKey, transform } from '../game/pieces';
import type { Cell, GameState, Placement } from '../game/types';
import { PLAYER_COLORS } from '../lib/colors';
import { isMuted, onMutedChange, setMuted, sfx } from '../lib/sound';
import { Board } from './Board';
import { HowToPlay } from './HowToPlay';
import { Journal } from './Journal';
import { Logo } from './Logo';
import { PieceTray, type Selection } from './PieceTray';
import { PlayerPanel } from './PlayerPanel';
import { Results } from './Results';
import { Button, IconButton } from './ui';

export interface GameViewProps {
  state: GameState;
  mode: 'local' | 'online';
  /** seats this browser may play for */
  controllable: number[];
  onPlace: (player: number, placement: Placement) => void;
  onRest: (player: number) => void;
  onExit: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onRestart?: () => void;
  onToLobby?: () => void;
  roomCode?: string;
  away?: boolean[];
  onReplaceWithBot?: (seat: number) => void;
}

export function GameView(props: GameViewProps) {
  const { state, mode, controllable, onPlace, onRest, onExit, onUndo, canUndo, onRestart, onToLobby, roomCode, away, onReplaceWithBot } = props;
  const current = state.players[state.current];
  const isMyTurn = !state.finished && current.kind === 'human' && controllable.includes(state.current);

  // Which seed packet is shown: whoever is acting here, else this browser's seat.
  const lastHuman = useRef(controllable[0] ?? 0);
  if (isMyTurn) lastHuman.current = state.current;
  const trayIndex = isMyTurn ? state.current : lastHuman.current;
  const trayPlayer = state.players[trayIndex];
  const trayColor = PLAYER_COLORS[trayPlayer.color];

  const [selection, setSelection] = useState<Selection | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [hint, setHint] = useState<Placement | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRest, setConfirmRest] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [copied, setCopied] = useState(false);

  useEffect(() => onMutedChange(setMutedState), []);

  // Reset transient UI whenever the turn changes hands.
  useEffect(() => {
    setHint(null);
    setConfirmRest(false);
  }, [state.turn, state.id]);

  useEffect(() => {
    setSelection(null);
  }, [trayIndex, state.id]);

  // Drop a selected piece once it's been planted (e.g. after undo/redo timing).
  useEffect(() => {
    if (selection && !trayPlayer.remaining.includes(selection.pieceId)) setSelection(null);
  }, [selection, trayPlayer.remaining]);

  useEffect(() => {
    if (isMyTurn) sfx.turn();
  }, [isMyTurn, state.turn]);

  useEffect(() => {
    if (!state.finished) {
      setShowResults(false);
      return;
    }
    const t = window.setTimeout(() => setShowResults(true), 900);
    return () => window.clearTimeout(t);
  }, [state.finished, state.id]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(t);
  }, [flash]);

  const anchors = useMemo(() => (isMyTurn ? anchorsFor(state, state.current) : []), [state, isMyTurn]);
  const playable = useMemo(() => (isMyTurn ? new Set(listMoves(state, state.current).map((m) => m.pieceId)) : null), [state, isMyTurn]);

  const shape = selection ? transform(PIECE_MAP[selection.pieceId].base, selection.rot, selection.flip) : null;
  const ghostCellsAt = useCallback(
    (cell: Cell | null): Cell[] | null => {
      if (!shape || !cell) return null;
      const [hx, hy] = handleOf(shape);
      return shape.map(([x, y]) => [x - hx + cell[0], y - hy + cell[1]] as Cell);
    },
    [shape],
  );
  const ghostCells = ghostCellsAt(hover);
  const ghostError =
    ghostCells && selection ? (isMyTurn ? validatePlacement(state, state.current, { pieceId: selection.pieceId, cells: ghostCells }) : 'Not your turn yet.') : null;

  const plant = (cell: Cell) => {
    if (!selection) return;
    const cells = ghostCellsAt(cell);
    if (!cells) return;
    if (!isMyTurn) {
      sfx.invalid();
      setFlash(state.finished ? 'The game is over.' : `Waiting for ${current.name}…`);
      return;
    }
    const err = validatePlacement(state, state.current, { pieceId: selection.pieceId, cells });
    if (err) {
      sfx.invalid();
      setFlash(err);
      return;
    }
    sfx.place();
    onPlace(state.current, { pieceId: selection.pieceId, cells });
    setSelection(null);
    setHint(null);
  };

  const rotate = useCallback((dir: 1 | -1) => {
    setSelection((s) => (s ? { ...s, rot: (s.rot + dir + 4) % 4 } : s));
    sfx.rotate();
  }, []);
  const flip = useCallback(() => {
    setSelection((s) => (s ? { ...s, flip: !s.flip } : s));
    sfx.rotate();
  }, []);

  const select = (pieceId: string) => {
    sfx.select();
    setSelection((s) => (s?.pieceId === pieceId ? null : { pieceId, rot: 0, flip: false }));
  };

  const showHint = useCallback(() => {
    if (!isMyTurn) return;
    const m = chooseBotMove(state, state.current, 'normal');
    if (!m) return;
    setHint(m);
    // pre-orient the piece so the ghost matches the suggestion
    const target = shapeKey(m.cells);
    const base = PIECE_MAP[m.pieceId].base;
    let orient = { rot: 0, flip: false };
    for (const f of [false, true]) {
      for (let r = 0; r < 4; r++) if (shapeKey(transform(base, r, f)) === target) orient = { rot: r, flip: f };
    }
    setSelection({ pieceId: m.pieceId, ...orient });
    setFlash(`Try the ${PIECE_MAP[m.pieceId].name} in the highlighted spot.`);
  }, [isMyTurn, state]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        if (onUndo && canUndo) {
          e.preventDefault();
          onUndo();
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (k === 'r' || k === 'arrowright') rotate(1);
      else if (k === 'q' || k === 'arrowleft') rotate(-1);
      else if (k === 'f' || k === 'arrowup' || k === 'arrowdown') flip();
      else if (k === 'escape') setSelection(null);
      else if (k === 'h') showHint();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rotate, flip, showHint, onUndo, canUndo]);

  const onCellTap = (cell: Cell, pointerType: string) => {
    if (!selection) return;
    if (pointerType === 'mouse') {
      setHover(cell);
      plant(cell);
      return;
    }
    // touch / pen: first tap previews, a second tap on the same cell plants
    if (hover && hover[0] === cell[0] && hover[1] === cell[1]) plant(cell);
    else setHover(cell);
  };

  const copyInvite = async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setFlash(url);
    }
  };

  const you = mode === 'online' ? controllable : controllable.length === 1 ? controllable : [];
  const bannerColor = PLAYER_COLORS[current.color];
  const banner = state.finished
    ? 'The garden is complete'
    : isMyTurn
      ? mode === 'online' || controllable.length === 1
        ? 'Your turn'
        : `${current.name}, your turn`
      : current.kind === 'bot'
        ? `${current.name} is thinking`
        : `Waiting for ${current.name}`;

  return (
    <div className="flex min-h-full flex-col">
      {/* top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/[0.05] bg-ink-900/80 px-3 py-2 backdrop-blur sm:px-5">
        <IconButton label="Leave game" onClick={onExit}>
          <ArrowLeft size={20} />
        </IconButton>
        <Logo size="sm" />
        {roomCode && (
          <button
            onClick={copyInvite}
            className="ml-1 hidden items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-ink-200 ring-1 ring-white/10 hover:bg-white/10 sm:inline-flex"
            title="Copy invite link"
          >
            Room <span className="font-mono tracking-widest text-ink-100">{roomCode}</span>
            {copied ? <Check size={13} className="text-[#a3f0cf]" /> : <Copy size={13} />}
          </button>
        )}
        <div className="flex-1" />
        <span className="hidden text-xs text-ink-400 sm:inline">Turn {state.turn}</span>
        {state.finished && (
          <IconButton label="Results" onClick={() => setShowResults(true)}>
            <Trophy size={19} className="text-sun" />
          </IconButton>
        )}
        <IconButton label="How to play" onClick={() => setShowHelp(true)}>
          <CircleHelp size={20} />
        </IconButton>
        <IconButton label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </IconButton>
        {(onRestart || onToLobby) && (
          <div className="relative">
            <IconButton label="Menu" onClick={() => setMenuOpen((o) => !o)} active={menuOpen}>
              <Menu size={20} />
            </IconButton>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    className="absolute right-0 top-12 z-50 w-48 rounded-2xl bg-ink-800 p-1.5 shadow-card ring-1 ring-white/10"
                  >
                    {onRestart && (
                      <MenuItem
                        onClick={() => {
                          setMenuOpen(false);
                          onRestart();
                        }}
                      >
                        <RefreshCcw size={15} /> New game
                      </MenuItem>
                    )}
                    {onToLobby && (
                      <MenuItem
                        onClick={() => {
                          setMenuOpen(false);
                          onToLobby();
                        }}
                      >
                        <Users size={15} /> Back to lobby
                      </MenuItem>
                    )}
                    <MenuItem onClick={onExit}>
                      <ArrowLeft size={15} /> Leave
                    </MenuItem>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 p-3 sm:p-5 lg:flex-row lg:items-start">
        {/* players */}
        <aside className="order-1 flex flex-col gap-3 lg:w-72 lg:shrink-0">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-2.5">
            {state.players.map((p, i) => (
              <PlayerPanel
                key={i}
                player={p}
                active={!state.finished && state.current === i}
                isYou={mode === 'online' ? controllable.includes(i) : false}
                away={away?.[i]}
                compact={false}
                onReplace={onReplaceWithBot ? () => onReplaceWithBot(i) : undefined}
              />
            ))}
          </div>
          <div className="hidden lg:block">
            <Journal state={state} />
          </div>
        </aside>

        {/* board */}
        <main className="order-2 flex min-w-0 flex-1 flex-col items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${banner}-${state.turn}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-2.5 rounded-full bg-ink-850/80 px-4 py-2 ring-1 ring-white/[0.07]"
            >
              <span className="h-3 w-3 rounded-full" style={{ background: state.finished ? '#ffd166' : bannerColor.fill, boxShadow: `0 0 12px ${bannerColor.glow}` }} />
              <span className="font-display text-base font-bold text-ink-100 sm:text-lg">{banner}</span>
              {!state.finished && current.kind === 'bot' && (
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-ink-300"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1, delay: d * 0.18 }}
                    />
                  ))}
                </span>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="relative w-full lg:w-[min(100%,calc(100dvh-150px))]">
            <Board
              state={state}
              ghost={ghostCells && selection ? { cells: ghostCells, valid: !ghostError, color: trayColor } : null}
              anchors={anchors}
              anchorColor={isMyTurn ? PLAYER_COLORS[current.color] : null}
              hint={hint?.cells ?? null}
              selecting={!!selection}
              onHover={setHover}
              onCellTap={onCellTap}
              onRotate={() => rotate(1)}
            />
            <AnimatePresence>
              {flash && (
                <motion.div
                  initial={{ opacity: 0, y: 10, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, y: 10, x: '-50%' }}
                  className="pointer-events-none absolute bottom-4 left-1/2 max-w-[90%] rounded-xl bg-ink-950/90 px-4 py-2 text-center text-sm font-medium text-ink-100 shadow-card ring-1 ring-white/10"
                >
                  {flash}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* tray */}
        <aside className="order-3 flex flex-col gap-3 lg:w-[300px] lg:shrink-0">
          <div className="rounded-2xl bg-ink-850/70 p-3 ring-1 ring-white/[0.06]">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
                {mode === 'local' && controllable.length > 1 ? `${trayPlayer.name}'s packet` : 'Your seed packet'}
              </span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: trayColor.fill }} />
            </div>
            {trayPlayer.out ? (
              <div className="rounded-xl bg-ink-950/50 p-4 text-center text-sm text-ink-300">
                {trayPlayer.allPlaced
                  ? '🌸 Every piece planted — full bloom!'
                  : trayPlayer.rested
                    ? 'Resting for the rest of this game. Sit back and watch the garden fill in.'
                    : 'No more room to grow. Sit back and watch the garden fill in.'}
              </div>
            ) : (
              <PieceTray
                player={trayPlayer}
                selection={selection}
                playable={playable}
                canAct={isMyTurn}
                onSelect={select}
                onRotate={rotate}
                onFlip={flip}
                onClear={() => setSelection(null)}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {selection && hover && isMyTurn && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full lg:hidden">
                  <Button variant="primary" className="w-full" disabled={!!ghostError} onClick={() => hover && plant(hover)}>
                    <Check size={16} /> Plant here
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <Button variant="soft" className="flex-1" onClick={showHint} disabled={!isMyTurn}>
              <Lightbulb size={16} /> Hint
            </Button>
            {onUndo && (
              <Button variant="soft" className="flex-1" onClick={onUndo} disabled={!canUndo}>
                <Undo2 size={16} /> Undo
              </Button>
            )}
            <Button
              variant={confirmRest ? 'danger' : 'ghost'}
              className="flex-1"
              disabled={!isMyTurn}
              onClick={() => {
                if (!confirmRest) {
                  setConfirmRest(true);
                  return;
                }
                setConfirmRest(false);
                setSelection(null);
                onRest(state.current);
              }}
              title="Stop planting for the rest of this game"
            >
              <Moon size={16} /> {confirmRest ? 'Sure? Tap again' : 'Rest'}
            </Button>
          </div>

          <div className="lg:hidden">
            <Journal state={state} limit={4} />
          </div>
        </aside>
      </div>

      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} />
      <Results
        state={state}
        open={showResults}
        you={you}
        onClose={() => setShowResults(false)}
        onRestart={onRestart}
        onExit={onExit}
        restartNote={mode === 'online' && !onRestart ? 'Waiting for the host to start a new game' : undefined}
      />
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-200 hover:bg-white/[0.08] hover:text-white">
      {children}
    </button>
  );
}
