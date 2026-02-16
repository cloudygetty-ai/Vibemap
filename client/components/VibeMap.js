'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import io from 'socket.io-client';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const socket = io(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000');

const VIBE_COLORS = {
  chill: '#3b82f6',
  intense: '#ef4444',
  busy: '#eab308',
};

export default function VibeMap({ onLocationSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-73.98, 40.75],
      zoom: 15,
      pitch: 65,
      bearing: -20,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    }), 'top-right');

    // Watch geolocation
    navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      socket.emit('update_location', { userId: 'me', lat: latitude, lng: longitude });
    });

    // Add 3D buildings on load
    map.current.on('load', () => {
      map.current.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#1a1a2e',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.85,
        },
      });

      // Ambient sky layer
      map.current.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });
    });

    // Click to select location
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      if (onLocationSelect) {
        onLocationSelect({ id: `${lat}-${lng}`, lat, lng });
      }
    });

    // Listen for global vibe changes
    socket.on('global_vibe_change', ({ lat, lng, vibeType }) => {
      addVibeMarker(lat, lng, vibeType);
    });

    // Listen for nearby users
    socket.on('nearby_update', (nearbyIds) => {
      // Could render nearby user markers here
    });

    return () => {
      map.current?.remove();
      socket.off('global_vibe_change');
      socket.off('nearby_update');
    };
  }, [onLocationSelect]);

  function addVibeMarker(lat, lng, vibeType) {
    const el = document.createElement('div');
    el.className = 'marker-vibe';
    el.style.boxShadow = `0 0 20px ${VIBE_COLORS[vibeType] || VIBE_COLORS.chill}`;
    el.style.background = VIBE_COLORS[vibeType] || VIBE_COLORS.chill;

    const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current);
    markersRef.current.push(marker);
  }

  return <div ref={mapContainer} className="w-full h-screen bg-black" />;
}
