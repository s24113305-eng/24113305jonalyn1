import { GameTheme } from "./types";

export const DEFAULT_THEME: GameTheme = {
  name: "Taipei Neon",
  backgroundColor: "#06010a",
  targetColor: "#1a082b",
  knifeHandleColor: "#ff0080", // Vibrant Magenta
  knifeBladeColor: "#e2e8f0",
  accentColor: "#00f7ff", // Electric Cyan
  description: "Inspired by the glowing energy of Shilin Night Market."
};

export const GAME_CONFIG = {
  TARGET_RADIUS: 95,
  KNIFE_WIDTH: 10,
  KNIFE_HEIGHT: 70,
  COLLISION_TOLERANCE: 0.22,
  THROW_SPEED: 32,
  GRAVITY: 0.8,
  PARTICLE_COUNT: 15,
  COMBO_WINDOW: 1500,
  CRYSTAL_SCORE: 10,
  TRAIL_LENGTH: 5
};