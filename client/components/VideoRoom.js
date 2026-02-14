import { useEffect, useRef, useState } from 'react';

export default function VideoRoom({ roomId }) {
  const videoRef = useRef(null);
  const [active, setActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActive(true);
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
      {active ? (
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full rounded-xl object-cover" />
      ) : (
        <button
          onClick={startCamera}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full transition"
        >
          Start Live Video
        </button>
      )}
      <p className="text-white/30 text-xs">Room: {roomId}</p>
    </div>
  );
}
