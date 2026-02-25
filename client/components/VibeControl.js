import { useState } from 'react';
import StreetViewer from './StreetViewer';
import VideoRoom from './VideoRoom';

export default function VibeControl({ activeLocation }) {
  const [viewMode, setViewMode] = useState('street'); // 'street' or 'video'

  if (!activeLocation) {
    return (
      <div className="fixed bottom-0 left-0 w-full glass-panel z-50 rounded-t-3xl overflow-hidden p-4 h-1/2 flex items-center justify-center bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="text-center text-gray-500">
          <div className="text-3xl mb-2">🗺️</div>
          <p className="text-sm">Tap a vibe on the map to explore</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl z-50 rounded-t-3xl overflow-hidden p-4 h-1/2 border-t border-white/10">
      {/* Tab switcher */}
      <div className="flex gap-3 mb-3">
        <button
          onClick={() => setViewMode('street')}
          className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
            viewMode === 'street'
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-gray-500 hover:text-white'
          }`}
        >
          360° View
        </button>
        <button
          onClick={() => setViewMode('video')}
          className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
            viewMode === 'video'
              ? 'bg-red-600 text-white'
              : 'bg-white/5 text-gray-500 hover:text-white'
          }`}
        >
          Live Video
        </button>
      </div>

      {/* Location label */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">{activeLocation.vibeType === 'intense' ? '🔥' : activeLocation.vibeType === 'busy' ? '🎉' : '😌'}</span>
        <span className="text-sm text-gray-300 font-medium capitalize">{activeLocation.vibeType ?? 'chill'} vibe</span>
        <span className="text-xs text-gray-500">· {activeLocation.lat?.toFixed(4)}, {activeLocation.lng?.toFixed(4)}</span>
      </div>

      {/* Content area */}
      <div className="w-full h-[calc(100%-88px)] rounded-xl overflow-hidden">
        {viewMode === 'street' ? (
          <StreetViewer location={activeLocation} />
        ) : (
          <VideoRoom roomId={`vibe-${activeLocation.lat?.toFixed(3)}-${activeLocation.lng?.toFixed(3)}`} />
        )}
      </div>
    </div>
  );
}
