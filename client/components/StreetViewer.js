'use client';

import { useEffect, useRef } from 'react';

export default function StreetViewer({ lat, lng }) {
  const containerRef = useRef(null);
  const panoramaRef = useRef(null);

  useEffect(() => {
    if (!window.google || !containerRef.current) return;

    panoramaRef.current = new window.google.maps.StreetViewPanorama(
      containerRef.current,
      {
        position: { lat, lng },
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
        disableDefaultUI: true,
        showRoadLabels: false,
      }
    );
  }, [lat, lng]);

  return (
    <>
      <script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}`}
        async
        defer
      />
      <div ref={containerRef} className="w-full h-full rounded-xl" />
    </>
  );
}
