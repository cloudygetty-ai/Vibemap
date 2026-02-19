import { useEffect, useRef } from 'react';

export default function StreetViewer({ location }) {
  const containerRef = useRef(null);
  const panoramaRef = useRef(null);

  useEffect(() => {
    if (!window.google || !window.google.maps) return;

    const position = location
      ? { lat: location.lat, lng: location.lng }
      : { lat: 40.75, lng: -73.98 };

    panoramaRef.current = new window.google.maps.StreetViewPanorama(
      containerRef.current,
      {
        position,
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        addressControl: false,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
      }
    );
  }, [location]);

  // Inject Google Maps script once
  useEffect(() => {
    if (document.getElementById('google-maps-script')) return;

    const key = process.env.NEXT_PUBLIC_GOOGLE_KEY;
    if (!key) return;

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    script.async = true;
    script.onload = () => {
      if (containerRef.current) {
        const position = location
          ? { lat: location.lat, lng: location.lng }
          : { lat: 40.75, lng: -73.98 };

        panoramaRef.current = new window.google.maps.StreetViewPanorama(
          containerRef.current,
          {
            position,
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: false,
            fullscreenControl: false,
          }
        );
      }
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center">
      {!process.env.NEXT_PUBLIC_GOOGLE_KEY && (
        <p className="text-white/50 text-sm">Google Maps API key not configured</p>
      )}
    </div>
  );
}
