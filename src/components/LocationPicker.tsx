import { useState, useEffect } from 'react';
import { MapContainer, Marker, useMapEvents } from 'react-leaflet';
import { SmartTileLayer } from '../lib/mapTiles';
import { parseCoordinates } from '../lib/coordinates';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../lib/mapSetup';


function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function LocationPicker({ 
  value, 
  onChange 
}: { 
  value: {lat: number, lng: number} | null, 
  onChange: (val: {lat: number, lng: number}) => void 
}) {
  const defaultCenter: [number, number] = [35.6892, 51.3890];
  const position: [number, number] = value ? [value.lat, value.lng] : defaultCenter;
  const [tilesFailed, setTilesFailed] = useState(false);

  // Without map tiles the location can still be entered: coordinates or a Neshan/Balad/Google link.
  if (tilesFailed) return <CoordinatesInput value={value} onChange={onChange} />;

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden shadow-sm border border-white/20 relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={12}
        maxZoom={19}
        className="w-full h-full"
      >
        <SmartTileLayer onUnavailable={() => setTilesFailed(true)} />
        <LocationMarker position={position} setPosition={(p) => onChange({lat: p[0], lng: p[1]})} />
      </MapContainer>
    </div>
  );
}

function CoordinatesInput({ value, onChange }: { value: { lat: number; lng: number } | null; onChange: (val: { lat: number; lng: number }) => void }) {
  const [text, setText] = useState(value ? `${value.lat}, ${value.lng}` : '');
  const parsed = text.trim() ? parseCoordinates(text) : null;
  return (
    <div className="space-y-2 rounded-xl border border-amber-300 dark:border-amber-500/40 p-3 bg-amber-50 dark:bg-amber-500/10">
      <p className="text-xs text-amber-800 dark:text-amber-300">نقشه بارگذاری نشد. مختصات یا لینک مکان را از نشان، بلد یا گوگل‌مپ اینجا بچسبانید:</p>
      <input
        dir="ltr"
        value={text}
        onChange={(e) => { setText(e.target.value); const c = parseCoordinates(e.target.value); if (c) onChange(c); }}
        placeholder="35.6892, 51.3890"
        aria-label="مختصات مکان"
        aria-invalid={Boolean(text.trim() && !parsed)}
        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] px-3 py-2 text-sm"
      />
      {text.trim() && (parsed
        ? <p className="text-xs text-emerald-700 dark:text-emerald-400">ثبت شد: {parsed.lat.toFixed(5)}, {parsed.lng.toFixed(5)}</p>
        : <p className="text-xs text-red-600">مختصات در این متن پیدا نشد.</p>)}
    </div>
  );
}
