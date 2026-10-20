import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { api } from '../lib/apiClient';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Event } from '../types';
import { useState, useEffect } from 'react';
import { Circle, Polygon } from 'react-leaflet';
import { PriceWidget } from './PriceWidget';

// Fix for default marker icon in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  events: Event[];
  userLocation?: { lat: number; lng: number } | null;
}

export default function MapComponent({ events, userLocation, onEventSelect, onPlaceSelect, onVibeSelect }: MapProps & { onEventSelect?: (e: Event) => void, onPlaceSelect?: (p: any) => void, onVibeSelect?: (v: any) => void }) {
  const [places, setPlaces] = useState<any[]>([]);
  const [vibes, setVibes] = useState<any[]>([]);

  useEffect(() => {
    api('/api/places', { silent: true }).then(data => setPlaces(data || [])).catch(() => {});
    api('/api/vibes', { silent: true }).then(data => setVibes(data || [])).catch(() => {});
  }, []);

  // When no list is passed in, show upcoming events around the user (or everywhere).
  const [ownEvents, setOwnEvents] = useState<Event[]>([]);
  useEffect(() => {
    if (events && events.length > 0) return;
    const near = userLocation ? `&lat=${userLocation.lat}&lng=${userLocation.lng}&radius=50` : '';
    api<any>(`/api/events?limit=50${near}`, { silent: true }).then(d => setOwnEvents(d.data || [])).catch(() => {});
  }, [events, userLocation?.lat, userLocation?.lng]);
  const shownEvents = events && events.length > 0 ? events : ownEvents;

  // Default center (e.g., Tehran)
  const defaultCenter: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [35.6892, 51.3890];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-white/10 relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MarkerClusterGroup chunkedLoading>
        {shownEvents.map((event) => {
          if (event.location && event.location.lat && event.location.lng) {
            return (
              <Marker key={event.id} position={[event.location.lat, event.location.lng]}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <h3 className="font-bold text-gray-100 text-sm mb-1">{event.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{event.location.address}</p>
                    <div className="text-xs font-semibold text-teal-600 dark:text-[#d9ff00] mt-2">
                      <PriceWidget cost={event.cost} />
                    </div>
                    {onEventSelect && <button className="mt-2 text-xs bg-teal-600 text-white px-2 py-1 rounded w-full" onClick={() => onEventSelect(event)}>جزئیات</button>}
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
        </MarkerClusterGroup>
        
        {places.map(place => {
          if (place.lat && place.lng) {
            // Custom icon for places could be added here
            const placeIcon = new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });
            return (
              <Marker key={`place-${place.id}`} position={[place.lat, place.lng]} icon={placeIcon}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <h3 className="font-bold text-gray-800 text-sm mb-1">پاتوق: {place.name}</h3>
                    <p className="text-xs text-gray-600">{place.type}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{place.address}</p>
                    {onPlaceSelect && <button className="mt-2 text-xs bg-teal-600 text-white px-2 py-1 rounded w-full" onClick={() => onPlaceSelect(place)}>جزئیات</button>}
                  </div>
                </Popup>
              </Marker>
            )
          }
          return null;
        })}
        
        {vibes.map(vibe => {
          if (vibe.polygon && vibe.polygon.length > 2) {
            return (
              <Polygon key={`vibe-${vibe.id}`} positions={vibe.polygon.map((p: any) => [p.lat, p.lng])} color="#6366f1" fillColor="#6366f1" fillOpacity={0.4}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <h3 className="font-bold text-indigo-600 text-sm mb-1">{vibe.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{vibe.description}</p>
                    {onVibeSelect && <button className="mt-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded w-full" onClick={() => onVibeSelect(vibe)}>جزئیات</button>}
                  </div>
                </Popup>
              </Polygon>
            )
          } else if (vibe.centerLat && vibe.centerLng) {
            return (
              <Circle key={`vibe-${vibe.id}`} center={[vibe.centerLat, vibe.centerLng]} radius={500} color="#6366f1" fillColor="#6366f1" fillOpacity={0.4}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <h3 className="font-bold text-indigo-600 text-sm mb-1">{vibe.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{vibe.description}</p>
                    {onVibeSelect && <button className="mt-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded w-full" onClick={() => onVibeSelect(vibe)}>جزئیات</button>}
                  </div>
                </Popup>
              </Circle>
            )
          }
          return null;
        })}

      </MapContainer>
    </div>
  );
}
