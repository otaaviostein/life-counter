import React, { createContext, useContext, useState, ReactNode } from "react";

interface GameContextType {
  gameStarted: boolean;
  setGameStarted: (started: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <GameContext.Provider value={{ gameStarted, setGameStarted }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};
