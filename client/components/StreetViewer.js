import { useEffect, useRef } from 'react';

export default function StreetViewer({ location }) {
  const containerRef = useRef(null);
  const panoramaRef = useRef(null);

  useEffect(() => {
    if (!location || !window.google?.maps?.StreetViewPanorama) return;

    const { lat, lng } = location;

    const sv = new window.google.maps.StreetViewService();

    sv.getPanorama({ location: { lat, lng }, radius: 100 }, (data, status) => {
      if (status === 'OK' && containerRef.current) {
        panoramaRef.current = new window.google.maps.StreetViewPanorama(
          containerRef.current,
          {
            position: { lat, lng },
            pov: { heading: 34, pitch: 10 },
            zoom: 1,
            addressControl: false,
            fullscreenControl: false,
            motionTracking: false,
            showRoadLabels: false,
          }
        );
      }
    });

    return () => {
      panoramaRef.current = null;
    };
  }, [location]);

  if (!location) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📍</div>
          <p className="text-sm">Select a location to view Street View</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      {/* Overlay info */}
      <div className="absolute top-2 left-2 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-xs text-white">
        📷 Street View · {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
      </div>
    </div>
  );
}
