
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Target, Heart, Trophy, CheckCircle2, ShieldCheck, Quote, 
  Star, Crosshair, ArrowRight, Zap 
} from 'lucide-react';

// --- TYPES ---
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

// --- CONSTANTS ---
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
  PARTICLE_COUNT: 15,
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
    MISSION_DESC: "Follow operational steps to secure the Prize Core.",
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
  }
};

const QUOTES = [
  "Precision is the pulse of the throw; Mastery is the echo of the heart.",
  "A steady hand finds the center of the storm.",
  "True focus is silence amidst the neon noise.",
  "Every throw is a conversation with gravity.",
  "In the heart of the night market, only the sharpest survive."
];

// --- HELPER COMPONENTS ---
const HUDCorners = () => (
  <>
    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-500/50 rounded-tl-3xl pointer-events-none"></div>
    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-500/50 rounded-tr-3xl pointer-events-none"></div>
    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-500/50 rounded-bl-3xl pointer-events-none"></div>
    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-500/50 rounded-br-3xl pointer-events-none"></div>
  </>
);

// --- CANVAS COMPONENT ---
const GameCanvas: React.FC<{
  theme: GameTheme;
  gameState: GameState;
  level: number;
  onHit: (multiplier: number) => void;
  onFail: () => void;
  onLevelComplete: () => void;
  onPrizeWon: (prize: string) => void;
  onDartsUpdate: (count: number) => void;
}> = ({ theme, gameState, level, onHit, onFail, onLevelComplete, onPrizeWon, onDartsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rotationRef = useRef(0);
  const speedRef = useRef(0.04);
  const boardScaleRef = useRef(1);
  const knivesRef = useRef<Knife[]>([]);
  const activeKnifeRef = useRef<Knife | null>(null);
  const fireworksRef = useRef<FireworkParticle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const knivesLeftRef = useRef(5);
  const shakeRef = useRef(0);
  const frameIdRef = useRef<number>(0);

  const initAudio = () => { if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); };
  const playSound = (freq: number) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtxRef.current.destination);
    osc.start(); osc.stop(audioCtxRef.current.currentTime + 0.1);
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      fireworksRef.current.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color, alpha: 1.0, size: Math.random() * 3 + 1, decay: 0.02
      });
    }
  };

  const drawDart = (ctx: CanvasRenderingContext2D, alpha = 1) => {
    const w = GAME_CONFIG.KNIFE_WIDTH, h = GAME_CONFIG.KNIFE_HEIGHT;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h * 0.6, 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(-0.5, h*0.1); ctx.lineTo(0, h/2 + 10); ctx.lineTo(0.5, h*0.1); ctx.fill();
    ctx.fillStyle = theme.knifeHandleColor; ctx.beginPath(); ctx.moveTo(0, -h/2 + 5); ctx.lineTo(-w * 2, -h/2 - 15); ctx.lineTo(0, -h/2 - 5); ctx.lineTo(w * 2, -h/2 - 15); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  const throwKnife = useCallback(() => {
    initAudio();
    if (activeKnifeRef.current || gameState !== GameState.PLAYING || knivesLeftRef.current <= 0) return;
    playSound(600);
    activeKnifeRef.current = { id: Date.now(), angle: 0, distance: 0, state: 'THROWN', x: canvasRef.current!.width / 2, y: canvasRef.current!.height - 120, trail: [] };
    knivesLeftRef.current--; onDartsUpdate(knivesLeftRef.current);
  }, [gameState, onDartsUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); throwKnife(); } };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [throwKnife]);

  const update = (time: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const { width, height } = canvas; const centerX = width / 2, centerY = height / 2.8;
    ctx.clearRect(0, 0, width, height);

    fireworksRef.current.forEach((p, idx) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.alpha -= p.decay;
      if (p.alpha <= 0) fireworksRef.current.splice(idx, 1);
      else { ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    });

    if (gameState === GameState.PLAYING) rotationRef.current += level === 6 ? 0.07 : 0.03 + (level * 0.01);
    let sx = 0, sy = 0; if (shakeRef.current > 0) { shakeRef.current -= 0.5; sx = (Math.random()-0.5)*shakeRef.current*4; sy = (Math.random()-0.5)*shakeRef.current*4; }

    const radius = GAME_CONFIG.TARGET_RADIUS + (level === 6 ? 60 : 0);
    ctx.save(); ctx.translate(centerX + sx, centerY + sy);

    if (level < 6) {
      ctx.rotate(rotationRef.current);
      ctx.strokeStyle = theme.accentColor; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 20; i++) {
        ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, radius, (i*Math.PI*2)/20, ((i+1)*Math.PI*2)/20);
        ctx.fillStyle = i % 2 === 0 ? "#0f172a" : "#020617"; ctx.fill();
      }
    } else {
      // PRIZE WHEEL Visuals
      ctx.save(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, radius + 10, 0, Math.PI * 2); ctx.stroke();
      const bulbCount = 20;
      for(let i=0; i<bulbCount; i++){
        const a = (i * Math.PI * 2 / bulbCount) + (time * 0.002);
        ctx.fillStyle = Math.floor(time / 100 + i) % 2 === 0 ? "#00ffff" : "#1e293b";
        ctx.beginPath(); ctx.arc(Math.cos(a)*(radius+10), Math.sin(a)*(radius+10), 5, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
      ctx.rotate(rotationRef.current);
      for (let i = 0; i < PRIZES.length; i++) {
        const sa = (i*Math.PI*2)/PRIZES.length - Math.PI/2 - Math.PI/PRIZES.length;
        const ea = ((i+1)*Math.PI*2)/PRIZES.length - Math.PI/2 - Math.PI/PRIZES.length;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, radius, sa, ea);
        ctx.fillStyle = PRIZE_COLORS[i]; ctx.fill();
        ctx.save(); ctx.rotate(sa + (ea-sa)/2); ctx.translate(radius*0.6, 0); ctx.fillStyle="white"; ctx.font="bold 14px Orbitron"; ctx.textAlign="center"; ctx.fillText(PRIZES[i], 0,0); ctx.restore();
      }
    }

    knivesRef.current.forEach(k => { ctx.save(); ctx.rotate(k.angle + Math.PI/2); ctx.translate(0, -radius); drawDart(ctx); ctx.restore(); });
    ctx.restore();

    if (level === 6) {
      ctx.save(); ctx.translate(centerX, centerY + radius + 15); ctx.fillStyle = "#00ffff"; ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(20,20); ctx.lineTo(-20,20); ctx.closePath(); ctx.fill(); ctx.restore();
    }

    if (activeKnifeRef.current) {
      const k = activeKnifeRef.current; k.y! -= GAME_CONFIG.THROW_SPEED;
      const hitY = centerY + radius;
      if (k.y! <= hitY) {
        let impactA = (Math.PI / 2) - rotationRef.current; impactA = (impactA % (Math.PI * 2)); if (impactA < 0) impactA += Math.PI * 2;
        if (level === 6) {
          const pIdx = Math.floor(impactA / (Math.PI*2/PRIZES.length)) % PRIZES.length;
          createExplosion(centerX, hitY, PRIZE_COLORS[pIdx]); onPrizeWon(PRIZES[pIdx]); activeKnifeRef.current = null;
        } else {
          const collision = knivesRef.current.some(o => Math.abs(o.angle - impactA) < GAME_CONFIG.COLLISION_TOLERANCE);
          if (collision) { activeKnifeRef.current = null; shakeRef.current = 10; onFail(); }
          else { k.state = 'STUCK'; k.angle = impactA; knivesRef.current.push({...k}); activeKnifeRef.current = null; onHit(1); if (knivesLeftRef.current === 0) setTimeout(onLevelComplete, 400); }
        }
      } else { ctx.save(); ctx.translate(k.x!, k.y!); ctx.rotate(Math.PI); drawDart(ctx); ctx.restore(); }
    } else if (knivesLeftRef.current > 0 && gameState === GameState.PLAYING) {
      ctx.save(); ctx.translate(centerX, height - 120); ctx.rotate(Math.PI); drawDart(ctx); ctx.restore();
    }

    frameIdRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(update);
    const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; } };
    window.addEventListener('resize', handleResize); handleResize();
    return () => { cancelAnimationFrame(frameIdRef.current); window.removeEventListener('resize', handleResize); };
  }, [gameState, level]);

  const resetLevel = useCallback(() => { knivesRef.current = []; knivesLeftRef.current = (level === 6 ? 1 : 5 + Math.floor(level/2)); onDartsUpdate(knivesLeftRef.current); }, [level]);
  useEffect(() => { resetLevel(); }, [level, resetLevel]);

  return <canvas ref={canvasRef} className="block w-full h-full touch-none" onMouseDown={throwKnife} />;
};

// --- MAIN UI COMPONENT ---
const UIOverlay: React.FC<{
  gameState: GameState; score: number; level: number; lives: number; dartsLeft: number; wonPrize: string | null;
  onStart: () => void; onRestart: () => void; onNextLevel: () => void; onPreviewWheel: () => void;
}> = ({ gameState, score, level, lives, dartsLeft, wonPrize, onStart, onRestart, onNextLevel, onPreviewWheel }) => {
  const t = TRANSLATIONS.en;
  const btnClass = "relative overflow-hidden group px-12 py-5 rounded-2xl font-black text-xl shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 title-font";

  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute inset-0 pointer-events-none p-8 z-10 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/5">
            <div className="text-6xl font-black text-white title-font">{score}</div>
            <div className="text-[10px] text-cyan-400 font-bold tracking-widest">{t.TOTAL_SCORE}</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/5 text-right">
            <div className="text-4xl font-black text-white title-font">{level === 6 ? "BONUS" : `S-${level}`}</div>
            <div className="text-[10px] text-cyan-400 font-bold uppercase">{level === 6 ? t.PRIZE_WHEEL : t.SECTOR}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`w-3 h-12 rounded-full border border-white/10 ${i < dartsLeft ? 'bg-cyan-400 shadow-[0_0_10px_#00ffff]' : 'bg-slate-900 opacity-20'}`}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
      {gameState === GameState.MENU && (
        <div className="text-center animate-in fade-in duration-500">
          <h1 className="glitch text-8xl font-black text-white uppercase title-font mb-12" data-text="DART LEGACY">DART <span className="text-rose-500">LEGACY</span></h1>
          <button onClick={onStart} className={`${btnClass} bg-cyan-500 text-black mx-auto mb-4`}><Target /> {t.INITIALIZE}</button>
          <button onClick={onPreviewWheel} className="text-cyan-400 text-xs font-bold tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity">Preview Prize Wheel</button>
        </div>
      )}
      {gameState === GameState.GAME_OVER && (
        <div className="text-center animate-in slide-in-from-top-8 duration-500">
          <ShieldCheck size={80} className="text-rose-500 mx-auto mb-8 rotate-180" />
          <h2 className="text-7xl font-black text-rose-500 mb-4 title-font uppercase">{t.GAME_OVER}</h2>
          <p className="text-slate-500 mb-10 tracking-widest text-sm font-bold uppercase">{t.PAY_MORE}</p>
          <button onClick={onRestart} className={`${btnClass} bg-rose-600 text-white w-full shadow-[0_0_40px_rgba(225,29,72,0.4)]`}><span>{t.PLAY_AGAIN}</span></button>
        </div>
      )}
      {gameState === GameState.LEVEL_COMPLETE && (
        <div className="text-center bg-slate-900/60 p-12 rounded-[3rem] border border-cyan-500/30 relative">
          <HUDCorners />
          <CheckCircle2 size={80} className="text-cyan-400 mx-auto mb-8" />
          <h2 className="text-5xl font-black text-white mb-8 title-font">{t.SECTOR_CLEAR}</h2>
          <button onClick={onNextLevel} className={`${btnClass} bg-rose-500 text-white w-full`}>{t.ACCESS_PRIZE}</button>
        </div>
      )}
      {gameState === GameState.PRIZE_WON && (
        <div className="text-center animate-in zoom-in duration-500">
          <Trophy size={100} className="text-yellow-400 mx-auto mb-8" />
          <h2 className="text-4xl font-black text-white mb-10 title-font uppercase">{t.REWARD_ACQUIRED}</h2>
          <div className="bg-black/60 p-12 rounded-full w-64 h-64 flex items-center justify-center mx-auto mb-12 border-2 border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.3)]">
             <span className="text-2xl font-black text-yellow-400 uppercase text-center title-font">{wonPrize}</span>
          </div>
          <button onClick={onRestart} className={`${btnClass} bg-cyan-500 text-black w-full`}>{t.NEW_CYCLE}</button>
        </div>
      )}
    </div>
  );
};

// --- ROOT APP ---
const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [dartsLeft, setDartsLeft] = useState(5);
  const [wonPrize, setWonPrize] = useState<string | null>(null);

  const handleStart = () => { setScore(0); setLevel(1); setLives(3); setGameState(GameState.PLAYING); };
  const handleRestart = () => { setScore(0); setLevel(1); setLives(3); setGameState(GameState.PLAYING); };
  const handleNextLevel = () => { setLevel(6); setGameState(GameState.PLAYING); };
  const handlePreviewWheel = () => { setLevel(6); setGameState(GameState.PLAYING); setDartsLeft(1); };
  const handleHit = (m: number) => setScore(s => s + m);
  const handleFail = () => setGameState(GameState.GAME_OVER);
  const handleLevelComplete = () => { if (level < 5) setLevel(l => l + 1); else setGameState(GameState.LEVEL_COMPLETE); };
  const handlePrizeWon = (p: string) => { setWonPrize(p); setGameState(GameState.PRIZE_WON); };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <GameCanvas 
        theme={DEFAULT_THEME} gameState={gameState} level={level} 
        onHit={handleHit} onFail={handleFail} onLevelComplete={handleLevelComplete} 
        onPrizeWon={handlePrizeWon} onDartsUpdate={setDartsLeft} 
      />
      <UIOverlay 
        gameState={gameState} score={score} level={level} lives={lives} wonPrize={wonPrize} dartsLeft={dartsLeft}
        onStart={handleStart} onRestart={handleRestart} onNextLevel={handleNextLevel} onPreviewWheel={handlePreviewWheel}
      />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
