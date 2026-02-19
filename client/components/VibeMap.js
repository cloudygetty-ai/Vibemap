import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import socket from '../lib/socket';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Stable anonymous session ID — persisted across page refreshes, unique per browser
function getSessionId() {
  const key = 'vibemap_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function VibeMap({ onLocationSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  // Ref keeps the click handler always current without re-initialising the map
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  useEffect(() => {
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-73.98, 40.75], zoom: 15, pitch: 65, bearing: -20
    });

    const userId = getSessionId();

    // Watch Geolocation and broadcast to server
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socket.emit('update_location', { userId, lat: latitude, lng: longitude });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
      },
      { enableHighAccuracy: true }
    );

    // Emit clicked location to parent so VibeControl can open.
    // Reading from the ref avoids a stale closure without re-running this effect.
    map.current.on('click', (e) => {
      const { lat, lng } = e.lngLat;
      onLocationSelectRef.current?.({ id: `${lat.toFixed(5)},${lng.toFixed(5)}`, lat, lng });
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

    return () => {
      navigator.geolocation.clearWatch(watchId);
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} className="w-full h-screen bg-black" />;
}
