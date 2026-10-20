const fs = require('fs');
let code = fs.readFileSync('src/components/MapComponent.tsx', 'utf8');

if (code.includes('const [places, setPlaces]')) {
  console.log('Already patched MapComponent');
  process.exit(0);
}

// Add imports
code = code.replace(
  "import { Event } from '../types';",
  "import { Event } from '../types';\nimport { useState, useEffect } from 'react';\nimport { Circle, Polygon } from 'react-leaflet';"
);

code = code.replace(
  `export default function MapComponent({ events, userLocation }: MapProps) {`,
  `export default function MapComponent({ events, userLocation }: MapProps) {
  const [places, setPlaces] = useState<any[]>([]);
  const [vibes, setVibes] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/places').then(res => res.json()).then(data => setPlaces(data || []));
    fetch('/api/vibes').then(res => res.json()).then(data => setVibes(data || []));
  }, []);
`
);

// Map markers
code = code.replace(
  `        </MarkerClusterGroup>`,
  `        </MarkerClusterGroup>
        
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
              <Marker key={\`place-\${place.id}\`} position={[place.lat, place.lng]} icon={placeIcon}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <h3 className="font-bold text-gray-800 text-sm mb-1">پاتوق: {place.name}</h3>
                    <p className="text-xs text-gray-600">{place.type}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{place.address}</p>
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
              <Polygon key={\`vibe-\${vibe.id}\`} positions={vibe.polygon.map((p: any) => [p.lat, p.lng])} color="#6366f1" fillColor="#6366f1" fillOpacity={0.4}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <h3 className="font-bold text-indigo-600 text-sm mb-1">{vibe.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{vibe.description}</p>
                  </div>
                </Popup>
              </Polygon>
            )
          } else if (vibe.centerLat && vibe.centerLng) {
            return (
              <Circle key={\`vibe-\${vibe.id}\`} center={[vibe.centerLat, vibe.centerLng]} radius={500} color="#6366f1" fillColor="#6366f1" fillOpacity={0.4}>
                <Popup>
                  <div className="text-right" dir="rtl">
                    <h3 className="font-bold text-indigo-600 text-sm mb-1">{vibe.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{vibe.description}</p>
                  </div>
                </Popup>
              </Circle>
            )
          }
          return null;
        })}
`
);

fs.writeFileSync('src/components/MapComponent.tsx', code);
