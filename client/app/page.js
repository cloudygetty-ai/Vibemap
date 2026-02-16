'use client';

import { useState } from 'react';
import VibeMap from '../components/VibeMap';
import VibeControl from '../components/VibeControl';

export default function Home() {
  const [activeLocation, setActiveLocation] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  const handleMapClick = (location) => {
    setActiveLocation(location);
    setShowPanel(true);
  };

  return (
    <main className="relative w-full h-screen">
      <VibeMap onLocationSelect={handleMapClick} />

      {/* Vibe type selector */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 flex gap-2">
        {['chill', 'intense', 'busy'].map((vibe) => (
          <button
            key={vibe}
            className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border transition-all
              ${vibe === 'chill' ? 'bg-blue-500/20 border-blue-400/40 text-blue-300 hover:bg-blue-500/30' : ''}
              ${vibe === 'intense' ? 'bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30' : ''}
              ${vibe === 'busy' ? 'bg-yellow-500/20 border-yellow-400/40 text-yellow-300 hover:bg-yellow-500/30' : ''}
            `}
          >
            {vibe === 'chill' && '🧊 '}
            {vibe === 'intense' && '🔥 '}
            {vibe === 'busy' && '⚡ '}
            {vibe.charAt(0).toUpperCase() + vibe.slice(1)}
          </button>
        ))}
      </div>

      {/* Location info bar */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 glass-panel px-5 py-2 rounded-2xl">
        <p className="text-xs text-white/50 tracking-widest uppercase">Live Vibes Nearby</p>
      </div>

      {/* Bottom panel */}
      {showPanel && activeLocation && (
        <VibeControl
          activeLocation={activeLocation}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* Close panel button when open */}
      {showPanel && (
        <button
          onClick={() => setShowPanel(false)}
          className="fixed top-6 right-6 z-50 glass-panel w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
        >
          ✕
        </button>
      )}
    </main>
  );
}
