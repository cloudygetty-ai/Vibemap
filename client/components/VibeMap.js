import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import io from 'socket.io-client';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function VibeMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-73.98, 40.75], zoom: 15, pitch: 65, bearing: -20
    });

    // Add 3D Building Layer
    map.current.on('load', () => {
      map.current.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'type': 'fill-extrusion',
        'paint': {
          'fill-extrusion-color': '#333',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-opacity': 0.8
        }
      });
    });

    // Connect socket lazily — don't crash if server is unavailable
    let socket;
    try {
      socket = io(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000', {
        reconnectionAttempts: 3,
        timeout: 5000,
      });
    } catch (e) {
      console.warn('Socket.io connection failed:', e);
    }

    // Watch Geolocation with error handling for iOS
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.current.flyTo({ center: [longitude, latitude], zoom: 16 });
          if (socket?.connected) {
            socket.emit('update_location', { userId: 'me', lat: latitude, lng: longitude });
          }
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return <div ref={mapContainer} className="w-full h-full bg-black" />;
}
