import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState } from './game/types';

const SpaceFlight: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const keysPressed = useRef<Record<string, boolean>>({});

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9);
      canvas.width = size;
      canvas.height = size;
      
      // Reinitialize game engine if size changes
      if (engineRef.current) {
        engineRef.current = new GameEngine(ctx);
      }
    };

    // Initial setup
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Initialize game engine
    engineRef.current = new GameEngine(ctx);
    setAudioEnabled(engineRef.current.getAudioEnabled());
    
    // Game loop
    const gameLoop = () => {
      if (engineRef.current) {
        engineRef.current.update();
        engineRef.current.render();
        setGameState(engineRef.current.getGameState());
      }
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    // Start game loop
    gameLoop();

    // Keyboard event handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keysPressed.current.left = true;
          engineRef.current.setMovementControl('left', true);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keysPressed.current.right = true;
          engineRef.current.setMovementControl('right', true);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          engineRef.current.setMovementControl('forward', true);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          engineRef.current.setMovementControl('backward', true);
          break;
        case 'Shift':
          engineRef.current.setMovementControl('boost', true);
          break;
        case ' ':
        case 'Space':
          engineRef.current.fireWeapon();
          break;
        case 'Tab':
          e.preventDefault();
          engineRef.current.switchWeapon();
          break;
        case 'Escape':
          setIsPaused(prev => !prev);
          if (engineRef.current) {
            engineRef.current.togglePause();
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keysPressed.current.left = false;
          engineRef.current.setMovementControl('left', false);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keysPressed.current.right = false;
          engineRef.current.setMovementControl('right', false);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          engineRef.current.setMovementControl('forward', false);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          engineRef.current.setMovementControl('backward', false);
          break;
        case 'Shift':
          engineRef.current.setMovementControl('boost', false);
          break;
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Toggle game pause
  const togglePause = () => {
    if (engineRef.current) {
      const paused = engineRef.current.togglePause();
      setIsPaused(paused);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (engineRef.current) {
      const enabled = engineRef.current.toggleAudio();
      setAudioEnabled(enabled);
    }
  };

  // Mobile controls handlers
  const handleVirtualButtonDown = (control: string) => {
    if (!engineRef.current) return;
    
    switch (control) {
      case 'forward':
        engineRef.current.setMovementControl('forward', true);
        break;
      case 'backward':
        engineRef.current.setMovementControl('backward', true);
        break;
      case 'left':
        engineRef.current.setMovementControl('left', true);
        break;
      case 'right':
        engineRef.current.setMovementControl('right', true);
        break;
      case 'boost':
        engineRef.current.setMovementControl('boost', true);
        break;
      case 'fire':
        if (!isPaused) engineRef.current.fireWeapon();
        break;
      case 'swap':
        if (!isPaused) engineRef.current.switchWeapon();
        break;
    }
  };

  const handleVirtualButtonUp = (control: string) => {
    if (!engineRef.current) return;
    
    switch (control) {
      case 'forward':
        engineRef.current.setMovementControl('forward', false);
        break;
      case 'backward':
        engineRef.current.setMovementControl('backward', false);
        break;
      case 'left':
        engineRef.current.setMovementControl('left', false);
        break;
      case 'right':
        engineRef.current.setMovementControl('right', false);
        break;
      case 'boost':
        engineRef.current.setMovementControl('boost', false);
        break;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="mb-4 flex items-center justify-between w-full max-w-xl">
        <h1 className="text-2xl font-bold text-blue-400">Space Flight</h1>
        <div className="flex gap-4">
          <button
            onClick={toggleAudio}
            className="px-3 py-1 bg-blue-900 rounded hover:bg-blue-800 transition"
          >
            {audioEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
          </button>
          <button
            onClick={togglePause}
            className="px-3 py-1 bg-blue-900 rounded hover:bg-blue-800 transition"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button 
            onClick={() => setShowControls(!showControls)} 
            className="px-3 py-1 bg-blue-900 rounded hover:bg-blue-800 transition"
          >
            Controls
          </button>
        </div>
      </div>
      
      {showControls && (
        <div className="mb-4 p-4 bg-gray-900 rounded-lg w-full max-w-xl">
          <h3 className="text-lg font-semibold mb-2">Game Controls</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p>WASD or Arrow Keys: Move</p>
              <p>Shift: Boost</p>
              <p>Space: Fire Weapon</p>
            </div>
            <div>
              <p>Tab: Switch Weapon</p>
              <p>ESC: Pause Game</p>
              <p>Green HUD: Status</p>
            </div>
          </div>
        </div>
      )}

      {gameState && (
        <div className="mb-4 grid grid-cols-3 gap-4 w-full max-w-xl text-center">
          <div className="bg-gray-900 rounded-lg p-2">
            <div className="text-sm text-gray-400">Score</div>
            <div className="text-xl text-green-400">{gameState.score}</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-2">
            <div className="text-sm text-gray-400">Shield</div>
            <div className="text-xl" style={{ color: gameState.shield < 30 ? '#ff4444' : '#44aaff' }}>
              {gameState.shield}%
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-2">
            <div className="text-sm text-gray-400">Energy</div>
            <div className="text-xl text-yellow-400">{gameState.energy}%</div>
          </div>
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-blue-500/30 rounded-full shadow-lg shadow-blue-500/20"
          style={{ maxWidth: '80vmin', maxHeight: '80vmin' }}
        />
        
        {/* Mobile controls */}
        {isMobile && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8">
            {/* Left side controls (movement) */}
            <div className="grid grid-cols-3 gap-2 touch-none">
              <button 
                className="w-16 h-16 bg-blue-900/70 rounded-full flex items-center justify-center text-2xl"
                onTouchStart={() => handleVirtualButtonDown('forward')}
                onTouchEnd={() => handleVirtualButtonUp('forward')}
              >
                ⬆️
              </button>
              <div></div>
              <div></div>
              
              <button 
                className="w-16 h-16 bg-blue-900/70 rounded-full flex items-center justify-center text-2xl"
                onTouchStart={() => handleVirtualButtonDown('left')}
                onTouchEnd={() => handleVirtualButtonUp('left')}
              >
                ⬅️
              </button>
              <button 
                className="w-16 h-16 bg-blue-900/70 rounded-full flex items-center justify-center text-2xl"
                onTouchStart={() => handleVirtualButtonDown('backward')}
                onTouchEnd={() => handleVirtualButtonUp('backward')}
              >
                ⬇️
              </button>
              <button 
                className="w-16 h-16 bg-blue-900/70 rounded-full flex items-center justify-center text-2xl"
                onTouchStart={() => handleVirtualButtonDown('right')}
                onTouchEnd={() => handleVirtualButtonUp('right')}
              >
                ➡️
              </button>
            </div>
            
            {/* Right side controls (actions) */}
            <div className="grid grid-cols-2 gap-2 touch-none">
              <button 
                className="w-16 h-16 bg-red-800/70 rounded-full flex items-center justify-center text-lg font-bold"
                onTouchStart={() => handleVirtualButtonDown('fire')}
              >
                FIRE
              </button>
              <button 
                className="w-16 h-16 bg-green-800/70 rounded-full flex items-center justify-center text-lg"
                onTouchStart={() => handleVirtualButtonDown('boost')}
                onTouchEnd={() => handleVirtualButtonUp('boost')}
              >
                BOOST
              </button>
              <button 
                className="w-16 h-16 bg-purple-800/70 rounded-full flex items-center justify-center text-sm"
                onTouchStart={() => handleVirtualButtonDown('swap')}
              >
                WEAPON
              </button>
              <button 
                className="w-16 h-16 bg-yellow-800/70 rounded-full flex items-center justify-center text-sm"
                onClick={togglePause}
              >
                {isPaused ? 'PLAY' : 'PAUSE'}
              </button>
            </div>
          </div>
        )}
      </div>

      {gameState?.currentWeapon && (
        <div className="mt-4 bg-gray-900 rounded-lg p-3 w-full max-w-xl">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-gray-400">Weapon: </span>
              <span className="uppercase font-bold" style={{ color: gameState.currentWeapon.color }}>
                {gameState.currentWeapon.type}
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full w-32">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${gameState.weaponCooldown * 100}%`,
                  backgroundColor: gameState.currentWeapon.color
                }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceFlight;