
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Target, Heart, Trophy, CheckCircle2, ShieldCheck, Quote, Star, 
  Crosshair, ArrowRight, Zap 
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  PRIZE_WON = 'PRIZE_WON'
}

interface GameTheme {
  name: string;
  backgroundColor: string;
  targetColor: string;
  knifeHandleColor: string;
  knifeBladeColor: string;
  accentColor: string;
  description: string;
}

interface Knife {
  id: number;
  angle: number;
  distance: number;
  state: 'THROWN' | 'STUCK' | 'FALLING';
  x?: number;
  y?: number;
  trail?: { x: number; y: number }[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
}

interface BonusItem {
  id: number;
  angle: number;
  hit: boolean;
  type: 'CRYSTAL';
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  decay: number;
  sparkle?: boolean;
}

// --- Constants ---
const DEFAULT_THEME: GameTheme = {
  name: "Taipei Neon",
  backgroundColor: "#06010a",
  targetColor: "#1a082b",
  knifeHandleColor: "#ff0080",
  knifeBladeColor: "#e2e8f0",
  accentColor: "#00f7ff",
  description: "Inspired by the glowing energy of Shilin Night Market."
};

const GAME_CONFIG = {
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

const PRIZES = ["NEON BLADE", "CYBER CORE", "PULSE ORB", "VOID DART", "ELECTRIC WING"];
const PRIZE_COLORS = ["#ff00ff", "#00ffff", "#ffff00", "#ff4d00", "#00ff00"];

const TRANSLATIONS = {
  en: {
    TITLE_DART: "DART",
    TITLE_LEGACY: "LEGACY",
    INITIALIZE: "INITIALIZE CHALLENGE",
    PREVIEW_WHEEL: "PREVIEW EXTRACTION",
    MISSION_BRIEF: "MISSION PROTOCOL",
    MISSION_DESC: "Follow these operational steps to secure the Prize Core.",
    START_MISSION: "COMMENCE MISSION",
    SECTOR_CLEAR: "SECTOR CLEAR!",
    ACCESS_PRIZE: "ACCESS PRIZE CORE",
    REWARD_ACQUIRED: "REWARD ACQUIRED",
    NEW_CYCLE: "NEW CYCLE",
    GAME_OVER: "GAME OVER",
    PLAY_AGAIN: "PLAY AGAIN",
    PAY_MORE: "PAY MORE TO CONTINUE",
    TOTAL_SCORE: "ACCUMULATED SCORE",
    SECTOR: "Sector",
    BONUS: "BONUS",
    PRIZE_WHEEL: "Reward Extraction",
    COPYRIGHT: "J.M.O 2025"
  },
  tw: {
    TITLE_DART: "飛鏢",
    TITLE_LEGACY: "傳奇",
    INITIALIZE: "啟動挑戰",
    PREVIEW_WHEEL: "預覽提取輪盤",
    MISSION_BRIEF: "任務協議",
    MISSION_DESC: "遵循這些操作步驟以獲得獎勵核心。",
    START_MISSION: "開始任務",
    SECTOR_CLEAR: "區域清除！",
    ACCESS_PRIZE: "進入獎勵核心",
    REWARD_ACQUIRED: "獲得獎勵",
    NEW_CYCLE: "新循環",
    GAME_OVER: "遊戲結束",
    PLAY_AGAIN: "再玩一次",
    PAY_MORE: "投入更多以繼續",
    TOTAL_SCORE: "累積總分",
    SECTOR: "區域",
    BONUS: "獎勵",
    PRIZE_WHEEL: "獎勵提取",
    COPYRIGHT: "J.M.O 2025"
  }
};

const QUOTES = {
  en: [
    "Precision is the pulse of the throw.",
    "A steady hand finds the center of the storm.",
    "The dart follows the vision, not just the hand.",
    "True focus is silence amidst the neon noise.",
    "Every throw is a conversation with gravity."
  ],
  tw: [
    "精準是投擲的脈搏。",
    "沉穩的手能找到風暴的中心。",
    "飛鏢跟隨的是遠見。",
    "真正的專注是霓虹噪音中的沉默。",
    "每一次投擲都是與重力的對話。"
  ]
};

// --- Components ---

const GameCanvas: React.FC<{
  theme: GameTheme;
  gameState: GameState;
  level: number;
  lives: number;
  onHit: (multiplier: number) => void;
  onFail: () => void;
  onLevelComplete: () => void;
  onPrizeWon: (prize: string) => void;
  onDartsUpdate?: (count: number) => void;
}> = ({ theme, gameState, level, lives, onHit, onFail, onLevelComplete, onPrizeWon, onDartsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rotationRef = useRef(0);
  const currentRotationSpeedRef = useRef(0.04);
  const boardScaleRef = useRef(1);
  const boardIntroAlphaRef = useRef(0);
  const knivesRef = useRef<Knife[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bonusItemsRef = useRef<BonusItem[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const fireworksRef = useRef<FireworkParticle[]>([]);
  const activeKnifeRef = useRef<Knife | null>(null);
  const knivesLeftRef = useRef(5);
  const shakeRef = useRef(0);
  const frameIdRef = useRef<number>(0);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (freq: number, duration = 0.1) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const createExplosion = (x: number, y: number, color?: string) => {
    const explosionColor = color || theme.accentColor;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      fireworksRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color: explosionColor, alpha: 1.0, size: Math.random() * 3 + 1,
        decay: