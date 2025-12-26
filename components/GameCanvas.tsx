import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, GameTheme, Knife, Particle, BonusItem, Shockwave } from '../types';
import { GAME_CONFIG } from '../constants';

const PRIZES = ["NEON BLADE", "CYBER CORE", "PULSE ORB", "VOID DART", "ELECTRIC WING"];
const PRIZE_COLORS = ["#ff00ff", "#00ffff", "#ffff00", "#ff4d00", "#00ff00"];

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

interface CelebrationSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

interface GameCanvasProps {
  theme: GameTheme;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  level: number;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  lives: number;
  onHit: (multiplier: number) => void;
  onFail: () => void;
  onLevelComplete: () => void;
  onPrizeWon: (prize: string) => void;
  onDartsUpdate?: (count: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  theme,
  gameState,
  level,
  lives,
  onHit,
  onFail,
  onLevelComplete,
  onPrizeWon,
  onDartsUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const rotationRef = useRef(0);
  const currentRotationSpeedRef = useRef(0.04);
  
  const boardScaleRef = useRef(1);
  const boardIntroAlphaRef = useRef(0);
  const nextBehaviorTimeRef = useRef(0);
  const behaviorStateRef = useRef<'NORMAL' | 'FAST' | 'SLOW' | 'REVERSE' | 'STUTTER'>('NORMAL');

  const knivesRef = useRef<Knife[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bonusItemsRef = useRef<BonusItem[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const fireworksRef = useRef<FireworkParticle[]>([]);
  const sparklesRef = useRef<CelebrationSparkle[]>([]);
  const activeKnifeRef = useRef<Knife | null>(null);
  const knivesLeftRef = useRef(5);
  const shakeRef = useRef(0);
  const frameIdRef = useRef<number>(0);
  const lastLivesRef = useRef(lives);

  const comboRef = useRef(1);
  const lastHitTimeRef = useRef(0);
  const lastFireworkTimeRef = useRef(0);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (freq: number, type: OscillatorType = 'sine', duration = 0.1, gainVal = 0.1) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const createExplosion = (x: number, y: number, customColor?: string) => {
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff4d00', '#00ff00', '#ffffff', '#ff80bf', '#ffaa00'];
    const color = customColor || colors[Math.floor(Math.random() * colors.length)];
    const count = 40 + Math.random() * 40;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      fireworksRef.current.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color, alpha: 1.0, size: Math.random() * 3 + 1, decay: 0.005 + Math.random() * 0.01,
        sparkle: Math.random() > 0.7
      });
    }
  };

  const drawNeonBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width * 0.8);
    grad.addColorStop(0, "#1e0b3d"); 
    grad.addColorStop(0.5, "#0d041a"); 
    grad.addColorStop(1, "#05010a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    if (sparklesRef.current.length < 30) {
      sparklesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4 - 0.1,
        size: Math.random() * 1.5,
        color: ["#ffffff", "#ff00ff", "#00ffff", "#ffff00"][Math.floor(Math.random() * 4)],
        life: 1.0
      });
    }

    sparklesRef.current.forEach((s, idx) => {
      s.x += s.vx; s.y += s.vy; s.life -= 0.004;
      if (s.life <= 0) sparklesRef.current.splice(idx, 1);
      else {
        ctx.globalAlpha = s.life * 0.4;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
      }
    });

    if (time - lastFireworkTimeRef.current > 1200) {
      createExplosion(Math.random() * width, Math.random() * (height * 0.4));
      lastFireworkTimeRef.current = time;
    }

    fireworksRef.current.forEach((p, idx) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.alpha -= p.decay;
      if (p.alpha <= 0) fireworksRef.current.splice(idx, 1);
      else {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.sparkle && Math.random() > 0.8) ctx.fillStyle = "#fff";
        ctx.shadowBlur = 10; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    });
    ctx.globalAlpha = 1.0;
  };

  const setupLevel = useCallback((lvl: number) => {
    boardIntroAlphaRef.current = 0;
    boardScaleRef.current = 0.8;
    shockwavesRef.current = [];
    comboRef.current = 1;

    if (lvl === 6) {
      knivesRef.current = [];
      bonusItemsRef.current = [];
      knivesLeftRef.current = 1;
      onDartsUpdate?.(1);
      rotationRef.current = 0;
      currentRotationSpeedRef.current = 0.06;
      return;
    }

    const targetKnives = 5;
    const existing: Knife[] = [];
    if (lvl > 1) {
      const obstacleCount = Math.min(lvl, 4);
      for (let i = 0; i < obstacleCount; i++) {
        existing.push({
          id: -100 - i,
          angle: (Math.PI * 2 * i) / obstacleCount + 0.5,
          distance: GAME_CONFIG.TARGET_RADIUS,
          state: 'STUCK'
        });
      }
    }

    const bonus: BonusItem[] = [];
    if (lvl >= 2) {
      const crystalCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < crystalCount; i++) {
        bonus.push({
          id: Date.now() + i,
          angle: Math.random() * Math.PI * 2,
          hit: false,
          type: 'CRYSTAL'
        });
      }
    }

    knivesRef.current = existing;
    bonusItemsRef.current = bonus;
    knivesLeftRef.current = targetKnives;
    onDartsUpdate?.(targetKnives);
    rotationRef.current = 0;
    activeKnifeRef.current = null;
    particlesRef.current = [];
  }, [onDartsUpdate]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) setupLevel(level);
  }, [level, gameState, setupLevel]);

  useEffect(() => {
    if (lives < lastLivesRef.current && lives > 0 && gameState === GameState.PLAYING && level < 6) {
      setupLevel(level);
    }
    lastLivesRef.current = lives;
  }, [lives, level, gameState, setupLevel]);

  const spawnParticles = (x: number, y: number, color: string, count = GAME_CONFIG.PARTICLE_COUNT) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        id: Math.random(), x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1.0, color, size: Math.random() * 3 + 1
      });
    }
  };

  const drawDart = (ctx: CanvasRenderingContext2D) => {
    const w = GAME_CONFIG.KNIFE_WIDTH;
    const h = GAME_CONFIG.KNIFE_HEIGHT;
    ctx.save();
    
    // Needle Tip
    const tipGrad = ctx.createLinearGradient(-1, h/2, 1, h/2);
    tipGrad.addColorStop(0, "#cbd5e1"); tipGrad.addColorStop(0.5, "#ffffff"); tipGrad.addColorStop(1, "#cbd5e1");
    ctx.fillStyle = tipGrad;
    ctx.beginPath(); 
    ctx.moveTo(-0.5, h/2 - 12); 
    ctx.lineTo(0, h/2 + 15); 
    ctx.lineTo(0.5, h/2 - 12); 
    ctx.fill();

    // Barrel
    const barrelY = h/2 - 35;
    const barrelH = 35;
    const barrelGrad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
    barrelGrad.addColorStop(0, "#1e293b"); 
    barrelGrad.addColorStop(0.4, "#94a3b8"); 
    barrelGrad.addColorStop(0.5, "#f1f5f9"); 
    barrelGrad.addColorStop(0.6, "#94a3b8");
    barrelGrad.addColorStop(1, "#1e293b");
    
    ctx.fillStyle = barrelGrad;
    ctx.beginPath(); 
    ctx.roundRect(-w/2, barrelY, w, barrelH, 3); 
    ctx.fill();

    // Flights
    const flightY = barrelY - 15;
    const flightH = 25;
    const flightW = w * 2.2;
    ctx.fillStyle = theme.knifeHandleColor;
    ctx.beginPath();
    ctx.moveTo(0, flightY);
    ctx.lineTo(-flightW, flightY - flightH);
    ctx.lineTo(0, flightY - flightH * 0.7);
    ctx.lineTo(flightW, flightY - flightH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const throwKnife = useCallback(() => {
    initAudio();
    if (activeKnifeRef.current || (gameState !== GameState.PLAYING && gameState !== GameState.PRIZE_WON) || knivesLeftRef.current <= 0) return;
    if (canvasRef.current) {
        const { height, width } = canvasRef.current;
        playSound(600, 'triangle', 0.1, 0.05);
        activeKnifeRef.current = {
            id: Date.now(), angle: 0, distance: 0, state: 'THROWN',
            x: width / 2, y: height - 120
        };
        knivesLeftRef.current--;
        onDartsUpdate?.(knivesLeftRef.current);
    }
  }, [gameState, onDartsUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); throwKnife(); } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [throwKnife]);

  const update = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 3 + 40;
    
    ctx.clearRect(0, 0, width, height);
    drawNeonBackground(ctx, width, height, time);

    if (boardIntroAlphaRef.current < 1) boardIntroAlphaRef.current += 0.05;
    if (boardScaleRef.current < 1) boardScaleRef.current += (1 - boardScaleRef.current) * 0.15;

    if (gameState === GameState.PLAYING) {
      if (level < 6) {
        if (time > nextBehaviorTimeRef.current) {
          const behaviors: Array<'NORMAL' | 'FAST' | 'SLOW' | 'REVERSE' | 'STUTTER'> = ['NORMAL', 'FAST', 'SLOW', 'REVERSE', 'STUTTER'];
          behaviorStateRef.current = behaviors[Math.floor(Math.random() * behaviors.length)];
          nextBehaviorTimeRef.current = time + 1000 + Math.random() * 1500;
        }
        const baseSpeed = 0.04 + (level * 0.012);
        let ts = baseSpeed;
        if (behaviorStateRef.current === 'FAST') ts *= 2.0;
        if (behaviorStateRef.current === 'SLOW') ts *= 0.4;
        if (behaviorStateRef.current === 'REVERSE') ts *= -1;
        if (behaviorStateRef.current === 'STUTTER') ts = Math.floor(time / 450) % 2 === 0 ? baseSpeed * 2.2 : 0;
        currentRotationSpeedRef.current += (ts - currentRotationSpeedRef.current) * 0.06;
        rotationRef.current += currentRotationSpeedRef.current;
      } else {
        rotationRef.current += 0.06 + Math.sin(time / 1000) * 0.02;
      }
    }

    const currentRotation = rotationRef.current;
    let sx = 0, sy = 0;
    if (shakeRef.current > 0) { shakeRef.current -= 0.5; sx = (Math.random()-0.5)*shakeRef.current*4; sy = (Math.random()-0.5)*shakeRef.current*4; }

    ctx.save();
    ctx.translate(centerX + sx, centerY + sy);
    ctx.scale(boardScaleRef.current, boardScaleRef.current);
    ctx.globalAlpha = boardIntroAlphaRef.current;
    
    const radius = GAME_CONFIG.TARGET_RADIUS + (level === 6 ? 60 : 0);
    ctx.rotate(currentRotation);
    
    if (level < 6) {
      ctx.strokeStyle = theme.accentColor; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, radius + 5, 0, Math.PI * 2); ctx.stroke();
      const segs = 20;
      for (let i = 0; i < segs; i++) {
        const sa = (i * Math.PI * 2) / segs - (Math.PI / 2) - (Math.PI / segs);
        const ea = ((i + 1) * Math.PI * 2) / segs - (Math.PI / 2) - (Math.PI / segs);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, radius, sa, ea);
        ctx.fillStyle = i % 2 === 0 ? "#0f172a" : "#020617";
        ctx.fill();
      }
    } else {
      const segs = PRIZES.length;
      for (let i = 0; i < segs; i++) {
        const sa = (i * Math.PI * 2) / segs - (Math.PI / 2) - (Math.PI / segs);
        const ea = ((i + 1) * Math.PI * 2) / segs - (Math.PI / 2) - (Math.PI / segs);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, radius, sa, ea);
        ctx.fillStyle = PRIZE_COLORS[i % PRIZE_COLORS.length];
        ctx.fill();
        ctx.save();
        const textAngle = sa + (ea - sa) / 2;
        ctx.rotate(textAngle); ctx.translate(radius * 0.65, 0); ctx.fillStyle = "#fff";
        ctx.font = "bold 14px 'Orbitron', sans-serif"; ctx.textAlign = "center"; ctx.fillText(PRIZES[i], 0, 0);
        ctx.restore();
      }
    }
    knivesRef.current.forEach(k => {
      ctx.save(); ctx.rotate(k.angle + Math.PI/2); ctx.translate(0, -radius); drawDart(ctx); ctx.restore();
    });
    ctx.restore();

    if (activeKnifeRef.current) {
        const k = activeKnifeRef.current;
        k.y! -= GAME_CONFIG.THROW_SPEED;
        const hitY = centerY + radius;
        if (k.y! - 35 <= hitY) {
            let impactA = (Math.PI / 2) - currentRotation;
            impactA = (impactA % (Math.PI * 2)); if (impactA < 0) impactA += Math.PI * 2;
            if (level === 6) {
                const segs = PRIZES.length;
                const pIdx = Math.floor(impactA / (Math.PI*2/segs)) % segs;
                onPrizeWon(PRIZES[pIdx]); activeKnifeRef.current = null;
            } else {
                const collision = knivesRef.current.some(o => {
                    let d = Math.abs(o.angle - impactA);
                    if (d > Math.PI) d = Math.PI*2 - d;
                    return d < GAME_CONFIG.COLLISION_TOLERANCE;
                });
                if (collision) {
                    activeKnifeRef.current = null; comboRef.current = 1; shakeRef.current = 10; onFail();
                } else {
                    const now = Date.now();
                    if (now - lastHitTimeRef.current < GAME_CONFIG.COMBO_WINDOW) comboRef.current++;
                    else comboRef.current = 1;
                    lastHitTimeRef.current = now;
                    k.state = 'STUCK'; k.angle = impactA; knivesRef.current.push({...k});
                    activeKnifeRef.current = null; playSound(150 + comboRef.current * 50);
                    onHit(comboRef.current);
                    if (knivesLeftRef.current === 0) setTimeout(onLevelComplete, 500);
                }
            }
        } else {
            ctx.save(); ctx.translate(k.x!, k.y!); ctx.rotate(Math.PI); drawDart(ctx); ctx.restore();
        }
    }
    if (knivesLeftRef.current > 0 && !activeKnifeRef.current && (gameState === GameState.PLAYING || gameState === GameState.PRIZE_WON)) {
        ctx.save(); ctx.translate(width/2, height-120); ctx.rotate(Math.PI); drawDart(ctx); ctx.restore();
    }
    frameIdRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [theme, gameState, level]);

  useEffect(() => {
    const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; } };
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="block w-full h-full touch-none" onMouseDown={throwKnife} onTouchStart={throwKnife} />;
};

export default GameCanvas;