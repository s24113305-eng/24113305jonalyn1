import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, GameTheme, Knife, Particle, BonusItem, Shockwave } from '../types';
import { GAME_CONFIG } from '../constants';

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
  const rotationRef = useRef(0);
  const knivesRef = useRef<Knife[]>([]);
  const fallingKnivesRef = useRef<any[]>([]);
  const activeKnifeRef = useRef<Knife | null>(null);
  const knivesLeftRef = useRef(5);
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef(performance.now());

  const drawDart = (ctx: CanvasRenderingContext2D, isFailed = false, rotationAngle = 0) => {
    const w = GAME_CONFIG.KNIFE_WIDTH || 15;
    const h = GAME_CONFIG.KNIFE_HEIGHT || 85;
    ctx.save();
    ctx.rotate(rotationAngle);
    if (isFailed) { ctx.shadowBlur = 25; ctx.shadowColor = "#f43f5e"; } 
    else { ctx.shadowBlur = 10; ctx.shadowColor = theme.accentColor || "#00f7ff"; }
    
    // Needle
    ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.moveTo(-0.5, h*0.1); ctx.lineTo(0, h/2 + 25); ctx.lineTo(0.5, h*0.1); ctx.fill();
    // Barrel
    ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h*0.65, 4); ctx.fill();
    // Flights
    ctx.fillStyle = isFailed ? "#f43f5e" : (theme.knifeHandleColor || "#ff0080"); 
    ctx.beginPath(); ctx.moveTo(0, -h/2 + 10); ctx.lineTo(-w*2.2, -h/2 - 25); ctx.lineTo(0, -h/2 - 8); ctx.lineTo(w*2.2, -h/2 - 25); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  const throwKnife = useCallback(() => {
    if (activeKnifeRef.current || gameState !== GameState.PLAYING || knivesLeftRef.current <= 0) return;
    activeKnifeRef.current = {
        id: Date.now(), angle: 0, distance: 0, state: 'THROWN',
        x: canvasRef.current!.width / 2, y: canvasRef.current!.height - 180
    };
    knivesLeftRef.current--;
    onDartsUpdate?.(knivesLeftRef.current);
  }, [gameState, onDartsUpdate]);

  useEffect(() => {
    // Shatter on level up
    if (canvasRef.current) {
        const centerX = canvasRef.current.width / 2;
        const centerY = canvasRef.current.height / 4 + 40;
        knivesRef.current.forEach(k => {
            const worldAngle = k.angle + rotationRef.current;
            fallingKnivesRef.current.push({
                x: centerX + Math.cos(worldAngle - Math.PI/2) * (GAME_CONFIG.TARGET_RADIUS || 115),
                y: centerY + Math.sin(worldAngle - Math.PI/2) * (GAME_CONFIG.TARGET_RADIUS || 115),
                vx: (Math.random() - 0.5) * 40, vy: -15, rotation: worldAngle, vRotation: (Math.random()-0.5)*0.3
            });
        });
    }
    knivesRef.current = []; knivesLeftRef.current = 5; onDartsUpdate?.(5);
  }, [level]);

  const update = (time: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 4 + 40;
    const dt = (time - lastTimeRef.current) / 1000; lastTimeRef.current = time;

    ctx.clearRect(0, 0, width, height);
    if (gameState === GameState.PLAYING) rotationRef.current += (0.03 + level * 0.015) * (dt * 60);

    for (let i = fallingKnivesRef.current.length - 1; i >= 0; i--) {
        const k = fallingKnivesRef.current[i];
        k.x += k.vx; k.y += k.vy; k.vy += 2.0; k.rotation += k.vRotation;
        ctx.save(); ctx.translate(k.x, k.y); drawDart(ctx, true, k.rotation); ctx.restore();
        if (k.y > height + 200) fallingKnivesRef.current.splice(i, 1);
    }

    ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(rotationRef.current);
    const radius = (GAME_CONFIG.TARGET_RADIUS || 115);
    ctx.strokeStyle = theme.accentColor; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, radius + 12, 0, Math.PI * 2); ctx.stroke();
    knivesRef.current.forEach(k => { ctx.save(); ctx.rotate(k.angle + Math.PI/2); ctx.translate(0, -radius); drawDart(ctx); ctx.restore(); });
    ctx.restore();

    if (activeKnifeRef.current) {
        const k = activeKnifeRef.current;
        k.y! -= 2800 * dt;
        const impactY = centerY + radius;
        if (k.y! - 45 <= impactY) {
            let impact = (Math.PI/2) - rotationRef.current; impact = (impact % (Math.PI * 2)); if (impact < 0) impact += Math.PI * 2;
            const hit = knivesRef.current.some(o => { let d = Math.abs(o.angle - impact); return (d > Math.PI ? Math.PI*2-d : d) < 0.2; });
            if (hit) {
                onFail();
                fallingKnivesRef.current.push({ x: centerX, y: k.y!, vx: (Math.random()-0.5)*40, vy: -20, rotation: Math.PI, vRotation: (Math.random()-0.5)*0.5 });
                activeKnifeRef.current = null;
            } else {
                knivesRef.current.push({ id: Date.now(), angle: impact, distance: radius, state: 'STUCK' });
                onHit(1); activeKnifeRef.current = null;
                if(knivesLeftRef.current === 0) setTimeout(onLevelComplete, 500);
            }
        } else { ctx.save(); ctx.translate(centerX, k.y!); ctx.rotate(Math.PI); drawDart(ctx); ctx.restore(); }
    }

    if (knivesLeftRef.current > 0 && gameState === GameState.PLAYING) {
        ctx.save(); ctx.translate(centerX, height - 180); ctx.rotate(Math.PI); drawDart(ctx); ctx.restore();
    }
    frameIdRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [gameState, level]);

  return <canvas ref={canvasRef} className="block w-full h-full touch-none" onPointerDown={throwKnife} />;
};

export default GameCanvas;