
import React, { useState, useEffect } from 'react';
import { GameState, GameTheme } from '../types';
import { Target, Heart, Trophy, CheckCircle2, MousePointer2, Keyboard, ShieldCheck, Quote, Star, Crosshair, ArrowRight, ArrowDown, Zap } from 'lucide-react';

interface UIOverlayProps {
  gameState: GameState;
  score: number;
  level: number;
  lives: number;
  dartsLeft: number;
  theme: GameTheme;
  wonPrize: string | null;
  setTheme: (t: GameTheme) => void;
  onStart: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
}

type Language = 'en' | 'tw';

const TRANSLATIONS = {
  en: {
    TITLE_DART: "DART",
    TITLE_LEGACY: "LEGACY",
    INITIALIZE: "INITIALIZE CHALLENGE",
    MISSION_BRIEF: "MISSION PROTOCOL",
    MISSION_DESC: "Follow these operational steps to secure the Prize Core.",
    START_MISSION: "COMMENCE MISSION",
    SECTOR_CLEAR: "SECTOR CLEAR!",
    ACCESS_PRIZE: "ACCESS PRIZE CORE",
    REWARD_ACQUIRED: "REWARD ACQUIRED",
    NEW_CYCLE: "NEW CYCLE",
    SYSTEM_FAILURE: "SYSTEM FAILURE",
    REBOOT: "REBOOT SYSTEM",
    STEP: "STEP",
    STEP1: "TARGET LOCK",
    STEP1_DESC: "The core rotates at dynamic intervals",
    STEP2: "ENGAGE",
    STEP2_DESC: "Trigger launch with [Space] or [Tap]",
    STEP3: "INTEGRITY",
    STEP3_DESC: "Impact with existing darts causes failure",
    STEP4: "EXTRACTION",
    STEP4_DESC: "Clear 5 sectors to unlock the vault",
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
    MISSION_BRIEF: "任務協議",
    MISSION_DESC: "遵循這些操作步驟以獲得獎勵核心。",
    START_MISSION: "開始任務",
    SECTOR_CLEAR: "區域清除！",
    ACCESS_PRIZE: "進入獎勵核心",
    REWARD_ACQUIRED: "獲得獎勵",
    NEW_CYCLE: "新循環",
    SYSTEM_FAILURE: "系統故障",
    REBOOT: "重啟系統",
    STEP: "步驟",
    STEP1: "鎖定目標",
    STEP1_DESC: "核心會以動態間隔旋轉",
    STEP2: "擊發",
    STEP2_DESC: "使用 [空格] 或 [點擊] 觸發發射",
    STEP3: "完整性",
    STEP3_DESC: "撞擊現有飛鏢將導致任務失敗",
    STEP4: "提取獎勵",
    STEP4_DESC: "清除 5 個區域即可解鎖保險庫",
    TOTAL_SCORE: "累積總分",
    SECTOR: "區域",
    BONUS: "獎勵",
    PRIZE_WHEEL: "獎勵提取",
    COPYRIGHT: "J.M.O 2025"
  }
};

const QUOTES = {
  en: [
    "Precision is the pulse of the throw; Mastery is the echo of the heart.",
    "A steady hand finds the center of the storm.",
    "The dart follows the vision, not just the hand.",
    "True focus is silence amidst the neon noise.",
    "Every throw is a conversation with gravity.",
    "In the heart of the night market, only the sharpest survive.",
    "The bullseye is a target; the journey is the point.",
    "Elegance in flight, lethal in landing.",
    "Steel, air, and concentration: the trinity of the dart."
  ],
  tw: [
    "精準是投擲的脈搏；精通是心靈的迴響。",
    "沉穩的手能找到風暴的中心。",
    "飛鏢跟隨的是遠見，而不僅僅是手。",
    "真正的專注是霓虹噪音中的沉默。",
    "每一次投擲都是與重力的對話。",
    "在夜市的心臟地帶，只有最敏銳的人才能生存。",
    "靶心是目標；旅程才是重點。",
    "飛行中盡顯優雅，著陸時致命精準。",
    "鋼鐵、空氣與專注：飛鏢的三位一體。"
  ]
};

const HUDCorners: React.FC = () => (
  <>
    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-500/50 rounded-tl-3xl pointer-events-none"></div>
    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-500/50 rounded-tr-3xl pointer-events-none"></div>
    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-500/50 rounded-bl-3xl pointer-events-none"></div>
    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-500/50 rounded-br-3xl pointer-events-none"></div>
  </>
);

const MiniDartboard: React.FC<{ color: string }> = ({ color }) => (
  <div className="relative w-24 h-24 animate-spin duration-[5000ms] linear">
    <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
    <div className={`absolute inset-0 border-2 border-dashed border-${color}-400/30 rounded-full`}></div>
    {[...Array(8)].map((_, i) => (
      <div 
        key={i} 
        className="absolute top-1/2 left-1/2 w-full h-[2px] bg-slate-700/50 -translate-y-1/2 -translate-x-1/2 origin-center" 
        style={{ transform: `translate(-50%, -50%) rotate(${i * 45}deg)` }}
      />
    ))}
    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-${color}-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]`}></div>
  </div>
);

const MiniDart: React.FC<{ rotate?: boolean, fail?: boolean }> = ({ rotate, fail }) => (
  <div className={`relative ${rotate ? 'animate-pulse' : ''}`}>
    <svg width="40" height="60" viewBox="0 0 24 40" fill="none" className={fail ? "text-rose-500" : "text-cyan-400"}>
       <path d="M12 38V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
       <path d="M12 32C12 32 19 24 19 16C19 8 16 4 12 4C8 4 5 8 5 16C5 24 12 32 12 32Z" fill="currentColor" fillOpacity="0.4"/>
       <path d="M12 4V0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
       <path d="M7 16L4 22M17 16L20 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    {fail && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-1 bg-rose-500 rotate-45 rounded-full absolute"></div>
        <div className="w-10 h-1 bg-rose-500 -rotate-45 rounded-full absolute"></div>
      </div>
    )}
  </div>
);

const TutorialStep: React.FC<{ 
  step: number; 
  title: string; 
  desc: string; 
  icon: React.ReactNode; 
  color: string;
  stepText: string;
}> = ({ step, title, desc, icon, color, stepText }) => (
  <div className="flex flex-col items-center gap-6 w-52 group perspective-1000">
    <div className={`text-xs font-black px-5 py-1.5 rounded-full mb-2 text-black shadow-[0_0_20px_rgba(0,0,0,0.3)] uppercase tracking-[0.2em] bg-${color}-400 transform transition-transform group-hover:scale-110`}>
      {stepText} {step}
    </div>
    
    <div className={`relative w-40 h-40 rounded-[3rem] bg-slate-900 border-2 border-${color}-500/40 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/10 to-transparent opacity-50`}></div>
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:10px_10px]"></div>
      <div className={`relative z-10 text-${color}-400 flex items-center justify-center`}>
        {icon}
      </div>
    </div>

    <div className="text-center px-2">
      <p className="text-white text-lg font-black uppercase mb-2 tracking-tight whitespace-nowrap group-hover:text-cyan-400 transition-colors">{title}</p>
      <p className="text-slate-400 text-[10px] font-bold leading-relaxed opacity-80 uppercase tracking-wider">{desc}</p>
    </div>
  </div>
);

const DartIcon: React.FC<{ color: string; active: boolean }> = ({ color, active }) => (
  <div className={`transition-all duration-500 ${active ? 'scale-110 opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'scale-75 opacity-20 grayscale'}`}>
    <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 38V32" stroke={active ? "#94a3b8" : "#475569"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 32C12 32 19 24 19 16C19 8 16 4 12 4C8 4 5 8 5 16C5 24 12 32 12 32Z" fill={active ? color : "#1e293b"}/>
      <path d="M12 4V0" stroke={active ? "#f1f5f9" : "#475569"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 16L4 22M17 16L20 22" stroke={active ? color : "#475569"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </div>
);

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, 
  score, 
  level, 
  lives,
  dartsLeft,
  theme, 
  wonPrize,
  onStart, 
  onRestart,
  onNextLevel
}) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [lang, setLang] = useState<Language>('en');

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (level === 1 && gameState === GameState.PLAYING && !hasSeenTutorial) {
      setShowTutorial(true);
      setHasSeenTutorial(true);
    }
    if (gameState === GameState.MENU) {
      const randomIdx = Math.floor(Math.random() * QUOTES.en.length);
      setQuoteIndex(randomIdx);
    }
  }, [level, gameState, hasSeenTutorial]);

  const btnClass = "relative overflow-hidden group px-8 sm:px-12 py-5 rounded-2xl font-black text-xl shadow-2xl transform transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 tracking-wider title-font";

  if (showTutorial) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/98 backdrop-blur-3xl p-4 sm:p-10">
        <div className="max-w-[1200px] w-full bg-slate-900/60 border border-white/5 rounded-[4rem] p-8 sm:p-16 text-center animate-in fade-in zoom-in duration-500 shadow-[0_0_150px_rgba(0,0,0,0.8)] relative flex flex-col items-center">
          <HUDCorners />
          
          <div className="mb-16">
            <h2 className="text-6xl font-black text-white mb-4 uppercase title-font tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              {t.MISSION_BRIEF}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <Zap size={16} className="text-cyan-400 animate-pulse" />
              <p className="text-cyan-400 text-sm font-black tracking-[0.4em] uppercase">{t.MISSION_DESC}</p>
              <Zap size={16} className="text-cyan-400 animate-pulse" />
            </div>
          </div>
          
          <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-12 mb-20 relative">
            {/* Visual Connectors (Desktop only) */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-y-1/2 hidden lg:block -z-10"></div>
            
            <TutorialStep 
              step={1} 
              title={t.STEP1} 
              desc={t.STEP1_DESC} 
              icon={<MiniDartboard color="cyan" />} 
              color="yellow" 
              stepText={t.STEP}
            />
            
            <div className="lg:block hidden"><ArrowRight className="text-slate-700 w-12 h-12" /></div>
            
            <TutorialStep 
              step={2} 
              title={t.STEP2} 
              desc={t.STEP2_DESC} 
              icon={<div className="scale-150 rotate-[135deg]"><MiniDart rotate /></div>} 
              color="cyan" 
              stepText={t.STEP}
            />
            
            <div className="lg:block hidden"><ArrowRight className="text-slate-700 w-12 h-12" /></div>
            
            <TutorialStep 
              step={3} 
              title={t.STEP3} 
              desc={t.STEP3_DESC} 
              icon={
                <div className="flex gap-2">
                   <div className="rotate-[-10deg] opacity-50"><MiniDart /></div>
                   <div className="rotate-[10deg]"><MiniDart fail /></div>
                </div>
              } 
              color="rose" 
              stepText={t.STEP}
            />
            
            <div className="lg:block hidden"><ArrowRight className="text-slate-700 w-12 h-12" /></div>

            <TutorialStep 
              step={4} 
              title={t.STEP4} 
              desc={t.STEP4_DESC} 
              icon={
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl animate-pulse rounded-full"></div>
                  <Trophy size={64} className="animate-bounce text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                </div>
              } 
              color="emerald" 
              stepText={t.STEP}
            />
          </div>

          <button onClick={() => setShowTutorial(false)} className="w-full max-w-lg bg-cyan-500 text-black font-black py-8 rounded-[2.5rem] hover:bg-cyan-400 shadow-[0_25px_60px_rgba(6,182,212,0.4)] uppercase title-font transition-all transform hover:-translate-y-2 active:translate-y-0 text-3xl flex items-center justify-center gap-6 group">
             <div className="p-2 bg-black/10 rounded-xl group-hover:rotate-12 transition-transform"><CheckCircle2 size={32} /></div>
             <span>{t.START_MISSION}</span>
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.PLAYING) {
    return (
      <>
        <div className="absolute top-0 left-0 w-full p-8 pointer-events-none flex justify-between items-start z-10">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/5 shadow-2xl">
              <div className="flex items-end gap-2">
                <span className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-tight title-font">{score}</span>
                <Star className="text-yellow-400 mb-2 animate-pulse" size={20} />
              </div>
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-[0.3em] ml-1">{t.TOTAL_SCORE}</span>
            </div>
            {level < 6 && (
              <div className="flex gap-2 mt-2 ml-2">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} size={24} className={i < lives ? "text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "text-slate-800"} />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end pointer-events-auto gap-3">
             <div className="bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/5 shadow-2xl flex flex-col items-end">
                <div className="flex items-center gap-3">
                   <Target size={28} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                   <span className="text-4xl font-black text-white title-font">{level === 6 ? t.BONUS : `S-${level.toString().padStart(2,'0')}`}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.3em]">{level === 6 ? t.PRIZE_WHEEL : t.SECTOR}</span>
             </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-10 flex flex-col-reverse items-center z-10 pointer-events-none">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] px-3 py-6 flex flex-col-reverse gap-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            {[...Array(5)].map((_, i) => ( <DartIcon key={i} color={theme.knifeHandleColor} active={i < dartsLeft} /> ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      {/* Language Switcher */}
      {gameState === GameState.MENU && (
        <div className="absolute top-8 right-8 flex gap-4 z-30 animate-in slide-in-from-right-8 duration-700">
          <button 
            onClick={() => setLang('en')} 
            className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center font-bold title-font text-sm ${lang === 'en' ? 'border-cyan-400 bg-cyan-400/20 text-white shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 'border-white/10 text-white/30 hover:border-white/30'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLang('tw')} 
            className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center font-bold title-font text-sm ${lang === 'tw' ? 'border-rose-400 bg-rose-400/20 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'border-white/10 text-white/30 hover:border-white/30'}`}
          >
            TW
          </button>
        </div>
      )}

      <div className="max-w-4xl w-full p-12 text-center animate-in fade-in zoom-in duration-700 flex flex-col items-center relative">
        {gameState === GameState.MENU && (
          <div className="w-full flex flex-col items-center">
            <div className="relative mb-12 mt-8">
              <h1 
                data-text={t.TITLE_DART + " " + t.TITLE_LEGACY}
                className="glitch text-7xl sm:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(34,211,238,0.6)] uppercase title-font leading-none"
              >
                {t.TITLE_DART} <span className="text-rose-500">{t.TITLE_LEGACY}</span>
              </h1>
              <div className="h-1 w-32 bg-cyan-500 mx-auto mt-4 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]"></div>
            </div>

            <div className="relative w-full max-w-lg bg-black/40 backdrop-blur-md p-10 rounded-[3rem] mb-12 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
               <HUDCorners />
               <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-20"><Crosshair size={60} className="text-cyan-500" /></div>
               <Quote size={28} className="text-rose-500/50 mb-6 mx-auto" />
               <p className="font-medium text-xl sm:text-2xl italic leading-relaxed px-4 text-slate-200 animate-neon-color-shift relative z-10">
                 "{QUOTES[lang][quoteIndex]}"
               </p>
            </div>

            <div className="flex flex-col gap-6 w-full max-w-fit relative">
              <button onClick={onStart} className={`${btnClass} bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.4)]`}>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Target size={24} className="group-hover:rotate-45 transition-transform" />
                <span className="relative z-10 whitespace-nowrap">{t.INITIALIZE}</span>
              </button>
            </div>
          </div>
        )}

        {gameState === GameState.LEVEL_COMPLETE && (
          <div className="animate-in slide-in-from-bottom-8 duration-500 max-w-md bg-slate-900/60 p-12 rounded-[3rem] border border-cyan-500/30 relative">
            <HUDCorners />
            <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-neon-pulse">
               <CheckCircle2 size={60} className="text-cyan-400" />
            </div>
            <h2 className="text-6xl font-black text-white mb-4 tracking-tight uppercase title-font">{t.SECTOR_CLEAR}</h2>
            <p className="text-slate-400 mb-10 tracking-widest text-xs font-bold">REWARD HUB CONNECTION ESTABLISHED</p>
            <button onClick={onNextLevel} className={`${btnClass} w-full bg-rose-500 text-white hover:bg-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)]`}>
              <span className="whitespace-nowrap">{t.ACCESS_PRIZE}</span>
            </button>
          </div>
        )}

        {gameState === GameState.PRIZE_WON && (
          <div className="animate-in zoom-in duration-500 max-w-md bg-slate-900/60 p-12 rounded-[4rem] border border-yellow-500/30 relative">
            <HUDCorners />
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-yellow-400/20 blur-3xl animate-pulse"></div>
              <Trophy size={100} className="mx-auto text-yellow-400 relative z-10" />
            </div>
            <h2 className="text-5xl font-black text-white mb-2 tracking-tight uppercase title-font">{t.REWARD_ACQUIRED}</h2>
            <div className="bg-black/60 p-12 rounded-full w-64 h-64 flex items-center justify-center mx-auto mb-12 border-2 border-yellow-400 shadow-[0_0_60px_rgba(234,179,8,0.2)]">
               <span className="text-3xl font-black text-yellow-400 uppercase text-center title-font tracking-tighter leading-tight drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">{wonPrize}</span>
            </div>
            <button onClick={onRestart} className={`${btnClass} bg-cyan-500 text-black w-full`}>
              <span className="whitespace-nowrap">{t.NEW_CYCLE}</span>
            </button>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="animate-in slide-in-from-top-8 duration-500 max-w-md">
            <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/30">
               <ShieldCheck size={60} className="text-rose-500 rotate-180" />
            </div>
            <h2 className="text-7xl font-black text-rose-500 mb-4 uppercase tracking-tighter title-font">{t.SYSTEM_FAILURE}</h2>
            <p className="text-slate-500 mb-10 tracking-[0.4em] text-xs font-bold uppercase">Critical integrity loss detected</p>
            <button onClick={onRestart} className={`${btnClass} bg-rose-600 text-white w-full shadow-[0_0_40px_rgba(225,29,72,0.4)]`}>
              <span className="whitespace-nowrap">{t.REBOOT}</span>
            </button>
          </div>
        )}
      </div>

      {/* Persistent subtle watermark at the very bottom */}
      <div className="absolute bottom-1.5 text-center px-4 animate-in fade-in duration-1000 delay-500 pointer-events-none">
         <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.6em] select-none">
           {t.COPYRIGHT}
         </p>
      </div>
    </div>
  );
};

export default UIOverlay;
