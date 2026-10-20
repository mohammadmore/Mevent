import fs from 'fs';
let content = fs.readFileSync('src/components/MapComponent.tsx', 'utf8');

const importStatement = `import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';`;
const newImportStatement = `import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';\nimport MarkerClusterGroup from 'react-leaflet-cluster';`;

content = content.replace(importStatement, newImportStatement);

const startMarkers = `{events.map((event) => {`;
const startMarkersNew = `<MarkerClusterGroup chunkedLoading>\n        {events.map((event) => {`;

content = content.replace(startMarkers, startMarkersNew);

const endMarkers = `return null;\n        })}`;
const endMarkersNew = `return null;\n        })}\n        </MarkerClusterGroup>`;

content = content.replace(endMarkers, endMarkersNew);

fs.writeFileSync('src/components/MapComponent.tsx', content);
