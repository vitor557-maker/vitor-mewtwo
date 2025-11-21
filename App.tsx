import React, { useState } from 'react';
import GameLogic from './components/GameLogic';
import { GameState } from './types';
import { Gamepad2 } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);

  const startGame = () => {
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-900">
      {gameState === GameState.MENU ? (
        <div className="w-full h-full flex flex-col items-center justify-center relative bg-[url('https://picsum.photos/1920/1080?grayscale')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          
          <div className="z-10 text-center space-y-8 p-8 border-4 border-white bg-black/80 max-w-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <Gamepad2 className="w-24 h-24 text-white mx-auto mb-4" />
            <h1 className="text-4xl md:text-6xl text-white font-bold drop-shadow-[4px_4px_0_#4f46e5]">
              GUERREIRO<br/>PIXEL
            </h1>
            
            <div className="space-y-4 text-gray-300 text-sm md:text-base leading-loose">
              <p>Sobreviva às hordas de monstros.</p>
              <p>Colete XP e escolha seu destino.</p>
              <p>Use <span className="text-yellow-400">[W,A,S,D]</span> para mover.</p>
              <p>O ataque é automático.</p>
            </div>

            <button 
              onClick={startGame}
              className="px-8 py-4 text-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors border-b-4 border-blue-800 active:border-b-0 active:mt-1"
            >
              INICIAR JORNADA
            </button>
          </div>
          
          <div className="absolute bottom-4 text-gray-500 text-xs">
            Powered by Gemini AI & React
          </div>
        </div>
      ) : (
        <GameLogic onGameStateChange={setGameState} />
      )}
    </div>
  );
};

export default App;
