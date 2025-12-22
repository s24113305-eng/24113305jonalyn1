export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  PRIZE_WON = 'PRIZE_WON'
}

export interface GameTheme {
  name: string;
  backgroundColor: string;
  targetColor: string;
  knifeHandleColor: string;
  knifeBladeColor: string;
  accentColor: string;
  description: string;
}

export interface Knife {
  id: number;
  angle: number;
  distance: number;
  state: 'THROWN' | 'STUCK' | 'FALLING';
  x?: number;
  y?: number;
  trail?: { x: number; y: number }[]; // Motion trail points
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
}

export interface BonusItem {
  id: number;
  angle: number; // Position on the log
  hit: boolean;
  type: 'CRYSTAL';
}

export interface Distraction {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}