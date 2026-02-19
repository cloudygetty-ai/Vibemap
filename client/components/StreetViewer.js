import { useEffect, useRef } from 'react';

function createPanorama(container, position) {
  return new window.google.maps.StreetViewPanorama(container, {
    position,
    pov: { heading: 0, pitch: 0 },
    zoom: 1,
    addressControl: false,
    fullscreenControl: false,
    motionTracking: false,
    motionTrackingControl: false,
  });
}

function loadGoogleMaps(key) {
  return new Promise((resolve) => {
    if (window.google?.maps) { resolve(); return; }
    if (document.getElementById('google-maps-script')) {
      // Script already injected — wait for it
      const interval = setInterval(() => {
        if (window.google?.maps) { clearInterval(interval); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

export default function StreetViewer({ location }) {
  const containerRef = useRef(null);
  const panoramaRef = useRef(null);

  // Create or update the panorama whenever location changes
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_KEY;
    if (!key || !containerRef.current) return;

    const position = location
      ? { lat: location.lat, lng: location.lng }
      : { lat: 40.75, lng: -73.98 };

    loadGoogleMaps(key).then(() => {
      if (!containerRef.current) return;
      if (panoramaRef.current) {
        // Move existing panorama instead of recreating it
        panoramaRef.current.setPosition(position);
      } else {
        panoramaRef.current = createPanorama(containerRef.current, position);
      }
    });
  }, [location]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center">
      {!process.env.NEXT_PUBLIC_GOOGLE_KEY && (
        <p className="text-white/50 text-sm">Google Maps API key not configured</p>
      )}
    </div>
  );
}
