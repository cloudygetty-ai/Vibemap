import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import io from 'socket.io-client';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const socket = io(process.env.NEXT_PUBLIC_SERVER_URL);

export default function VibeMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-73.98, 40.75], zoom: 15, pitch: 65, bearing: -20
    });

    // Watch Geolocation
    navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      socket.emit('update_location', { userId: 'me', lat: latitude, lng: longitude });
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
  }, []);

  return <div ref={mapContainer} className="w-full h-screen bg-black" />;
}
