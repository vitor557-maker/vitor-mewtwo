import React, { useState } from 'react';
import GameLogic from './components/GameLogic';
import { GameState } from './types';
import { Gamepad2, Settings, X } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [mobileMode, setMobileMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const startGame = () => {
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-900">
      {gameState === GameState.MENU ? (
        <div className="w-full h-full flex flex-col items-center justify-center relative bg-[url('https://picsum.photos/1920/1080?grayscale')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          
          {/* Settings Modal */}
          {showSettings && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
              <div className="bg-gray-900 border-4 border-white p-8 max-w-sm w-full relative shadow-2xl">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                >
                  <X className="w-8 h-8" />
                </button>
                <h2 className="text-2xl text-white font-bold mb-6 text-center">CONFIGURAÇÕES</h2>
                
                <div className="flex items-center justify-between bg-gray-800 p-4 rounded border border-gray-700">
                  <span className="text-white">Modo Mobile (Joystick)</span>
                  <button 
                    onClick={() => setMobileMode(!mobileMode)}
                    className={`w-16 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${mobileMode ? 'bg-green-500 justify-end' : 'bg-gray-600 justify-start'}`}
                  >
                    <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Ative isso se estiver jogando no celular para ver o controle na tela.
                </p>
              </div>
            </div>
          )}
          
          <div className="z-10 text-center space-y-8 p-8 border-4 border-white bg-black/80 max-w-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <Gamepad2 className="w-24 h-24 text-white mx-auto mb-4" />
            <h1 className="text-4xl md:text-6xl text-white font-bold drop-shadow-[4px_4px_0_#4f46e5]">
              GUERREIRO<br/>PIXEL
            </h1>
            
            <div className="space-y-4 text-gray-300 text-sm md:text-base leading-loose">
              <p>Sobreviva às hordas de monstros.</p>
              <p>Colete XP e escolha seu destino.</p>
              {!mobileMode && <p>Use <span className="text-yellow-400">[W,A,S,D]</span> para mover.</p>}
              {mobileMode && <p>Use o <span className="text-green-400">Joystick Virtual</span> para mover.</p>}
              <p>O ataque é automático.</p>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button 
                onClick={startGame}
                className="px-8 py-4 text-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors border-b-4 border-blue-800 active:border-b-0 active:mt-1 w-full"
              >
                INICIAR JORNADA
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="px-8 py-3 text-sm bg-gray-700 text-white hover:bg-gray-600 transition-colors border-b-4 border-gray-900 active:border-b-0 active:mt-1 flex items-center justify-center gap-2 w-full"
              >
                <Settings className="w-5 h-5" />
                CONFIGURAÇÕES
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-4 text-gray-500 text-xs">
            Powered by Gemini AI & React
          </div>
        </div>
      ) : (
        <GameLogic onGameStateChange={setGameState} mobileMode={mobileMode} />
      )}
    </div>
  );
};

export default App;