import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LatLng {
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  startCoords: LatLng | null;
  endCoords: LatLng | null;
  routeShape: [number, number][];
  selectionMode: 'start' | 'end' | null;
  onMapClick: (coords: LatLng) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ 
  startCoords, 
  endCoords, 
  routeShape, 
  selectionMode,
  onMapClick 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Custom Icons
  const createIcon = (color: string) => L.divIcon({
    className: 'custom-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  const startIcon = createIcon('#2563eb'); // Blue
  const endIcon = createIcon('#dc2626');   // Red

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView([52.0693, 19.4803], 6); // Poland center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on('click', (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;
    
    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Empty dependency array ensures run once

  // Update Click Handler ref to access latest props if needed (or rely on parent passing stable handler)
  useEffect(() => {
    if(!mapInstanceRef.current) return;
    mapInstanceRef.current.off('click');
    mapInstanceRef.current.on('click', (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }, [onMapClick]);

  // Update Cursor based on mode
  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.style.cursor = selectionMode ? 'crosshair' : 'grab';
  }, [selectionMode]);

  // Handle Start Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    if (startCoords) {
      if (startMarkerRef.current) {
        startMarkerRef.current.setLatLng([startCoords.lat, startCoords.lng]);
      } else {
        startMarkerRef.current = L.marker([startCoords.lat, startCoords.lng], { icon: startIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup("Start");
      }
    } else if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
  }, [startCoords]);

  // Handle End Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (endCoords) {
      if (endMarkerRef.current) {
        endMarkerRef.current.setLatLng([endCoords.lat, endCoords.lng]);
      } else {
        endMarkerRef.current = L.marker([endCoords.lat, endCoords.lng], { icon: endIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup("Cel");
      }
    } else if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
  }, [endCoords]);

  // Handle Polyline
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (routeShape.length > 0) {
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(routeShape);
      } else {
        polylineRef.current = L.polyline(routeShape, { color: '#2563eb', weight: 5, opacity: 0.7 })
          .addTo(mapInstanceRef.current);
      }
      // Fit bounds to route
      mapInstanceRef.current.fitBounds(L.polyline(routeShape).getBounds(), { padding: [50, 50] });
    } else if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
  }, [routeShape]);

  return <div ref={mapContainerRef} className="w-full h-full z-0" />;
};