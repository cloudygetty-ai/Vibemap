'use client';

import { useState } from 'react';
import StreetViewer from './StreetViewer';
import VideoRoom from './VideoRoom';

export default function VibeControl({ activeLocation, onClose }) {
  const [viewMode, setViewMode] = useState('street');

  return (
    <div className="fixed bottom-0 left-0 w-full glass-panel z-50 rounded-t-3xl overflow-hidden p-4 h-1/2 animate-slide-up">
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setViewMode('street')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            viewMode === 'street'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
          }`}
        >
          360 View
        </button>
        <button
          onClick={() => setViewMode('video')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            viewMode === 'video'
              ? 'bg-red-600 text-white border border-red-500'
              : 'bg-red-600/30 text-red-300 border border-red-500/30 hover:bg-red-600/50'
          }`}
        >
          Live Video
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/30">
            {activeLocation.lat.toFixed(4)}, {activeLocation.lng.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="w-full h-[calc(100%-3.5rem)] rounded-xl overflow-hidden">
        {viewMode === 'street' ? (
          <StreetViewer lat={activeLocation.lat} lng={activeLocation.lng} />
        ) : (
          <VideoRoom roomId={activeLocation.id} />
        )}
      </div>
    </div>
  );
}
