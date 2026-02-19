import { useState } from 'react';
import StreetViewer from './StreetViewer';
import VideoRoom from './VideoRoom';

export default function VibeControl({ activeLocation, onClose }) {
  const [viewMode, setViewMode] = useState('street'); // 'street' or 'video'

  return (
    <div className="fixed bottom-0 left-0 w-full glass-panel z-50 rounded-t-3xl overflow-hidden p-4 h-1/2">
      <div className="flex gap-4 mb-4 items-center">
        <button onClick={() => setViewMode('street')} className="bg-white/10 px-4 py-2 rounded-full">360° View</button>
        <button onClick={() => setViewMode('video')} className="bg-red-600 px-4 py-2 rounded-full">Live Video</button>
        <button onClick={onClose} className="ml-auto bg-white/10 px-3 py-2 rounded-full text-white/60 hover:text-white">✕</button>
      </div>

      {viewMode === 'street' ? (
        <StreetViewer location={activeLocation} />
      ) : (
        <VideoRoom roomId={activeLocation.id} />
      )}
    </div>
  );
}
