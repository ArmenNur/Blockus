import { readJSON, writeJSON } from './storage';

/** Tiny WebAudio synth — no audio files to ship. */
let ctx: AudioContext | null = null;
let muted = readJSON<boolean>('bloomgrid.muted', false);
const listeners = new Set<(m: boolean) => void>();

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.07) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  select: () => tone(660, 0, 0.07, 'triangle', 0.04),
  rotate: () => tone(540, 0, 0.06, 'triangle', 0.035),
  place: () => {
    tone(392, 0, 0.12, 'triangle', 0.08);
    tone(587, 0.06, 0.18, 'sine', 0.06);
  },
  invalid: () => tone(150, 0, 0.14, 'square', 0.025),
  turn: () => {
    tone(784, 0, 0.14, 'sine', 0.05);
    tone(1046, 0.09, 0.2, 'sine', 0.045);
  },
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.11, 0.35, 'triangle', 0.06)),
};

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
  writeJSON('bloomgrid.muted', value);
  listeners.forEach((l) => l(value));
}

export function onMutedChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
