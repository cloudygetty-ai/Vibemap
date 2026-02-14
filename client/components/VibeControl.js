import { useState } from 'react';
import VideoRoom from './VideoRoom';

export default function VibeControl({ activeLocation }) {
  const [viewMode, setViewMode] = useState('street');

  return (
    <div className="fixed bottom-0 left-0 w-full glass-panel z-50 rounded-t-3xl overflow-hidden p-4" style={{ height: '40dvh' }}>
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setViewMode('street')}
          className={`px-4 py-2 rounded-full text-white text-sm ${viewMode === 'street' ? 'bg-white/20' : 'bg-white/10'}`}
        >
          360° View
        </button>
        <button
          onClick={() => setViewMode('video')}
          className={`px-4 py-2 rounded-full text-white text-sm ${viewMode === 'video' ? 'bg-red-700' : 'bg-red-600'}`}
        >
          Live Video
        </button>
      </div>

      {viewMode === 'street' ? (
        <div className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center">
          <p className="text-white/40 text-sm text-center px-4">Street View — requires Google API key</p>
        </div>
      ) : (
        <VideoRoom roomId={activeLocation.id} />
      )}
    </div>
  );
}
