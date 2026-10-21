import { MapContainer, Marker, Popup } from 'react-leaflet';
import { SmartTileLayer, MapUnavailableNotice } from '../lib/mapTiles';
import { api } from '../lib/apiClient';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { placeIcon } from '../lib/mapSetup';
import { Event } from '../types';
import { useState, useEffect } from 'react';
import { Circle, Polygon } from 'react-leaflet';
import { PriceWidget } from './PriceWidget';


interface MapProps {
  events: Event[];
  userLocation?: { lat: number; lng: number } | null;
}

export default function MapComponent({ events, userLocation, onEventSelect, onPlaceSelect, onVibeSelect }: MapProps & { onEventSelect?: (e: Event) => void, onPlaceSelect?: (p: any) => void, onVibeSelect?: (v: any) => void }) {
  const [places, setPlaces] = useState<any[]>([]);
  const [tilesFailed, setTilesFailed] = useState(false);
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
      {tilesFailed && <MapUnavailableNotice>نشانگرها سر جایشان هستند؛ برای جزئیات روی هر کدام بزنید یا از فهرست رویدادها استفاده کنید.</MapUnavailableNotice>}
      <MapContainer 
        center={defaultCenter} 
        zoom={12}
        maxZoom={19}
        className="w-full h-full"
        zoomControl={false}
      >
        <SmartTileLayer onUnavailable={() => setTilesFailed(true)} />
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
