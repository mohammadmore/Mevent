import React, { useState } from 'react';
import { MapContainer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../lib/mapSetup';
import { SmartTileLayer, mapsKnownUnavailable } from '../lib/mapTiles';

// Small read-only map with one pin (event / place pages). Loaded lazily; when no tile source
// works it renders `fallback` instead (address + navigation links).

export default function MiniMap({ lat, lng, fallback, className = 'min-h-[300px]' }: { lat: number; lng: number; fallback?: React.ReactNode; className?: string }) {
  const [failed, setFailed] = useState(mapsKnownUnavailable);
  if (failed) return <>{fallback ?? null}</>;
  return (
    <MapContainer center={[lat, lng]} zoom={15} maxZoom={19} scrollWheelZoom={false} className={`w-full h-full ${className}`}>
      <SmartTileLayer onUnavailable={() => setFailed(true)} />
      <Marker position={[lat, lng]} />
    </MapContainer>
  );
}
