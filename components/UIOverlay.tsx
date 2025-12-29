import React, { useState, useEffect } from 'react';
import { GameState, GameTheme } from '../types';
import { Target, Heart, Trophy, RotateCcw, Quote, Star, Crosshair } from 'lucide-react';

interface UIOverlayProps {
  gameState: GameState;
  score: number;
  level: number;
  lives: number;
  dartsLeft: number;
  theme: GameTheme;
  wonPrize: string | null;
  onStart: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
}

const QUOTES = [
  "Precision is the pulse of the throw.",
  "A steady hand finds the center of the storm.",
  "The dart follows the vision, not the hand.",
  "Focus is the silence amidst the neon noise.",
  "Every throw is a conversation with gravity."
];

const DartIconHUD: React.FC<{ active: boolean; color: string }> = ({ active, color }) => (
  <div className={`transition-all duration-300 ${active ? 'scale-110 opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'scale-75 opacity-20 grayscale'}`}>
    <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
      <path d="M12 32C12 32 19 24 19 16C19 8 16 4 12 4C8 4 5 8 5 16C5 24 12 32 12 32Z" fill={active ? color : "#475569"}/>
      <path d="M11.2 0H12.8V40H11.2V0Z" fill={active ? "white" : "#475569"} />
    </svg>
  </div>
);

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, score, level, lives, dartsLeft, theme, wonPrize, onStart, onRestart, onNextLevel 
}) => {
  const [currentQuote, setCurrentQuote] = useState(QUOTES[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (gameState === GameState.PLAYING) {
    return (
      <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-3">
            <div className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-xl">
              <div className="text-6xl font-black text-cyan-400 title-font">{score}</div>
              <div className="text-[10px] text-white/40 font-bold uppercase tracking-[0.4em]">SCORE</div>
            </div>
            <div className="flex gap-2 ml-2">
              {[...Array(3)].map((_, i) => (
                <Heart key={i} size={28} className={i < lives ? "text-rose-500 fill-rose-500 animate-pulse" : "text-slate-800"} />
              ))}
            </div>
          </div>
          <div className="bg-black/40 p-4 rounded-3xl border border-white/5 flex flex-col items-end">
             <div className="flex items-center gap-3">
                <Target size={28} className="text-cyan-400" />
                <span className="text-4xl font-black text-white title-font">{`S-${level.toString().padStart(2,'0')}`}</span>
             </div>
          </div>
        </div>

        <div className="absolute bottom-1/4 left-0 w-full flex justify-center">
            <p className="opacity-40 text-cyan-400 italic font-black text-xl uppercase tracking-tighter">"{currentQuote}"</p>
        </div>

        <div className="flex flex-col-reverse gap-4 ml-8 mb-16">
           {[...Array(5)].map((_, i) => ( <DartIconHUD key={i} active={i < dartsLeft} color={theme.knifeHandleColor} /> ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl p-8 text-center overflow-y-auto">
      {gameState === GameState.MENU && (
        <div className="flex flex-col items-center animate-in fade-in duration-700">
           <div className="mb-10 w-40 h-40 border-2 border-cyan-500/20 rounded-full flex items-center justify-center animate-spin-slow">
              <Crosshair size={80} className="text-cyan-400 opacity-50" />
           </div>
           <h1 className="text-7xl md:text-[8rem] font-black text-white uppercase mb-12 title-font">
              DART <span className="text-rose-500">LEGACY</span>
           </h1>
           <div className="bg-black/30 p-8 rounded-[2rem] border border-white/5 mb-12">
              <Quote className="mx-auto mb-4 text-rose-500/50" />
              <p className="italic text-xl text-slate-300">"{currentQuote}"</p>
           </div>
           <button onClick={onStart} className="bg-cyan-500 text-black px-16 py-8 rounded-full font-black text-3xl hover:scale-110 transition-all uppercase title-font">INITIALIZE CHALLENGE</button>
        </div>
      )}
      {gameState === GameState.GAME_OVER && (
        <div className="flex flex-col items-center">
           <h2 className="text-7xl font-black text-rose-500 mb-8 title-font">SYSTEM FAILURE</h2>
           <button onClick={() => window.location.reload()} className="bg-emerald-500 text-black px-24 py-8 rounded-full font-black text-3xl title-font"><RotateCcw size={40} className="inline mr-4" /> REBOOT</button>
        </div>
      )}
      {gameState === GameState.LEVEL_COMPLETE && (
        <div className="flex flex-col items-center">
           <Trophy size={140} className="text-yellow-400 mb-8 animate-bounce" />
           <h2 className="text-6xl font-black text-white mb-4 title-font">ALL SECTORS CLEAR</h2>
           <button onClick={onRestart} className="bg-cyan-500 text-black px-20 py-10 rounded-full font-black text-3xl title-font uppercase">NEW CYCLE</button>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;