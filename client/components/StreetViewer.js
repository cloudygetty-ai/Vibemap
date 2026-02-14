import { useEffect, useRef } from 'react';

export default function StreetViewer({ lat, lng }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof google !== 'undefined' && containerRef.current) {
      new google.maps.StreetViewPanorama(containerRef.current, {
        position: { lat: lat || 40.75, lng: lng || -73.98 },
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
      });
    }
  }, [lat, lng]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center">
      <p className="text-white/40 text-sm">Street View — requires Google API key</p>
    </div>
  );
}
