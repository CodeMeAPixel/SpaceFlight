'use client';

import ClientSpaceFlight from '@/components/ClientSpaceFlight';
import { useState, useEffect } from 'react';

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stars, setStars] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    // Generate stars only on the client side to avoid hydration mismatch
    const generatedStars = Array.from({ length: 100 }).map((_, i) => {
      const top = `${Math.random() * 100}%`;
      const left = `${Math.random() * 100}%`;
      const width = `${Math.random() * 3 + 1}px`;
      const height = `${Math.random() * 3 + 1}px`;
      const opacity = Math.random() * 0.7 + 0.3;
      const duration = `${Math.random() * 5 + 3}s`;
      const delay = `${Math.random() * 5}s`;
      
      return (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top,
            left,
            width,
            height,
            opacity,
            animation: `twinkle ${duration} ease-in-out infinite`,
            animationDelay: delay
          }}
        />
      );
    });
    
    setStars(generatedStars);
    
    // Add a slight delay to allow for smooth animation
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-purple-900/20"></div>
          {/* Star field background - client-side rendered */}
          <div className="absolute inset-0 overflow-hidden">
            {stars}
          </div>
        </div>
        
        <div className={`max-w-2xl transition-all duration-1000 px-6 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center space-y-6">
            <h1 className="text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">SPACEFLIGHT</h1>
            <p className="text-xl opacity-90 max-w-xl mx-auto">Navigate through space, avoid obstacles, collect power-ups and survive as long as possible!</p>
          </div>
          
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="space-y-4 bg-blue-900/20 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <h2 className="text-2xl font-semibold text-blue-300">How to Play</h2>
              <ul className="space-y-3 opacity-90">
                <li className="flex items-center gap-3">
                  <span className="bg-blue-800/50 px-2 py-1 rounded text-sm">← →</span>
                  <span>Navigate your ship</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-red-800/50 px-2 py-1 rounded text-sm">SPACE</span>
                  <span>Fire your weapons</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-purple-800/50 px-2 py-1 rounded text-sm">TAB</span>
                  <span>Switch weapons</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4 bg-purple-900/20 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-500/10">
              <h2 className="text-2xl font-semibold text-purple-300">Power-Ups</h2>
              <ul className="space-y-3 opacity-90">
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                  <span>Shield - Restores your defensive shield</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                  <span>Energy - Refills your weapon energy</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-400"></div>
                  <span>Weapon - Upgrades your current weapon</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-10 text-center">
            <button 
              onClick={() => setGameStarted(true)}
              className="px-12 py-5 bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-600 hover:to-purple-600 rounded-full transition-all text-2xl font-bold shadow-lg shadow-blue-500/20 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              START GAME
            </button>
            
            <p className="mt-4 text-sm opacity-50">Press ESC during game to pause</p>
          </div>
        </div>
        
        <style jsx global>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return <ClientSpaceFlight />;
}
