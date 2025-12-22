import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, GameTheme } from './types';
import { DEFAULT_THEME, GAME_CONFIG } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [dartsLeft, setDartsLeft] = useState(5);
  const [theme, setTheme] = useState<GameTheme>(DEFAULT_THEME);
  const [wonPrize, setWonPrize] = useState<string | null>(null);

  const handleStart = () => {
    setScore(0);
    setLevel(1);
    setLives(3);
    setDartsLeft(5);
    setWonPrize(null);
    setGameState(GameState.PLAYING);
  };

  const handleRestart = () => {
    setScore(0);
    setLevel(1);
    setLives(3);
    setDartsLeft(5);
    setWonPrize(null);
    setGameState(GameState.PLAYING);
  };

  const handleLevelComplete = () => {
    if (level === 5) {
      setGameState(GameState.LEVEL_COMPLETE);
    } else if (level < 5) {
      setLevel(prev => prev + 1);
    }
  };

  const handleNextLevel = () => {
    if (level === 5) {
      setLevel(6);
      setGameState(GameState.PLAYING);
    }
  };

  const handleFail = () => {
    if (level === 6) return;
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameState(GameState.GAME_OVER);
        return 0;
      }
      return newLives;
    });
  };

  const handleHit = (multiplier: number) => {
    setScore(prev => prev + (1 * multiplier));
  };

  const handlePrizeWon = (prize: string) => {
    setWonPrize(prize);
    setGameState(GameState.PRIZE_WON);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      <GameCanvas 
        theme={theme}
        gameState={gameState}
        setGameState={setGameState}
        level={level}
        setLevel={setLevel}
        score={score}
        setScore={setScore}
        lives={lives}
        onHit={handleHit}
        onFail={handleFail}
        onLevelComplete={handleLevelComplete}
        onPrizeWon={handlePrizeWon}
        onDartsUpdate={setDartsLeft}
      />
      
      <UIOverlay 
        gameState={gameState}
        score={score}
        level={level}
        lives={lives}
        dartsLeft={dartsLeft}
        theme={theme}
        setTheme={setTheme}
        wonPrize={wonPrize}
        onStart={handleStart}
        onRestart={handleRestart}
        onNextLevel={handleNextLevel}
      />
    </div>
  );
};

export default App;