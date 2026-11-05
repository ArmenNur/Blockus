export interface PlayerColor {
  key: string;
  name: string;
  fill: string;
  light: string;
  dark: string;
  glow: string;
}

export const PLAYER_COLORS: PlayerColor[] = [
  { key: 'rose', name: 'Rose', fill: '#f0607f', light: '#ffb1c2', dark: '#b42f4f', glow: 'rgba(240,96,127,0.45)' },
  { key: 'marigold', name: 'Marigold', fill: '#f6a623', light: '#ffd98c', dark: '#b4710b', glow: 'rgba(246,166,35,0.45)' },
  { key: 'iris', name: 'Iris', fill: '#7d89ff', light: '#c7ccff', dark: '#4450c8', glow: 'rgba(125,137,255,0.45)' },
  { key: 'fern', name: 'Fern', fill: '#33c48a', light: '#a3f0cf', dark: '#14875a', glow: 'rgba(51,196,138,0.45)' },
];

export const SUN_COLOR = '#ffd166';
