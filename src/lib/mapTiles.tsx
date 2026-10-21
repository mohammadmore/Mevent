import React, { useEffect, useRef, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import { api } from './apiClient';

// Map tiles with automatic fallback, decided in the browser (what the server can reach says
// nothing about what the visitor can reach). Sources come from /api/config/maps in order; if the
// current one has not drawn a tile within TILE_TIMEOUT_MS, or its first tiles fail, the next one is
// used. The source that works is remembered for the session so later maps start with it.

export interface TileProvider { id: string; url: string; attribution: string; subdomains?: string; maxZoom?: number }

const TILE_TIMEOUT_MS = 2500;
const RETRY_ALL_AFTER_MS = 5 * 60_000;
const STORAGE_KEY = 'mevent_map_tiles';

const DEFAULT_PROVIDERS: TileProvider[] = [
  { id: 'carto', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 20 },
  { id: 'osm', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap', maxZoom: 19 },
];

let providersPromise: Promise<TileProvider[]> | null = null;
let providersCache: TileProvider[] | null = null;
function loadProviders() {
  providersPromise ??= api<{ data: { tiles: TileProvider[] } }>('/api/config/maps', { silent: true })
    .then(d => (d.data.tiles?.length ? d.data.tiles : DEFAULT_PROVIDERS))
    .catch(() => DEFAULT_PROVIDERS)
    .then(list => (providersCache = list));
  return providersPromise;
}

interface Remembered { working?: string; allFailedAt?: number }
function readRemembered(): Remembered {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function remember(value: Remembered) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* private mode */ }
}

/** True when every tile source failed recently in this session (callers can skip the map). */
export function mapsKnownUnavailable() {
  const r = readRemembered();
  return Boolean(r.allFailedAt && Date.now() - r.allFailedAt < RETRY_ALL_AFTER_MS);
}

function startIndex(list: TileProvider[]) {
  const working = readRemembered().working;
  const i = list.findIndex(p => p.id === working);
  return i >= 0 ? i : 0;
}

/** Drop-in replacement for <TileLayer> inside a <MapContainer>. */
export function SmartTileLayer({ onUnavailable }: { onUnavailable?: () => void }) {
  const map = useMap();
  const [providers, setProviders] = useState<TileProvider[] | null>(providersCache);
  const [index, setIndex] = useState(() => (providersCache ? startIndex(providersCache) : 0));
  const loaded = useRef(0);
  const errors = useRef(0);
  const settled = useRef(false);

  useEffect(() => {
    if (providers) return;
    loadProviders().then(list => { setProviders(list); setIndex(startIndex(list)); });
  }, [providers]);

  useEffect(() => {
    if (mapsKnownUnavailable()) onUnavailable?.();
  }, []);

  const provider = providers?.[index];

  const advance = () => {
    if (settled.current || !providers) return;
    // Offline: no source can work, and none should be blamed for it.
    if (!navigator.onLine) return;
    settled.current = true;
    if (index + 1 < providers.length) setIndex(index + 1);
    else { remember({ allFailedAt: Date.now() }); onUnavailable?.(); }
  };

  useEffect(() => {
    if (!provider) return;
    loaded.current = 0;
    errors.current = 0;
    settled.current = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      if (settled.current || loaded.current) return;
      // A hidden map requests no tiles; wait until it is on screen before judging the source.
      const size = map.getSize();
      if (!size.x || !size.y || document.visibilityState !== 'visible') { timer = setTimeout(check, TILE_TIMEOUT_MS); return; }
      advance();
    };
    timer = setTimeout(check, TILE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [provider?.id]);

  if (!provider) return null;
  return (
    <TileLayer
      key={provider.id}
      url={provider.url}
      attribution={provider.attribution}
      subdomains={provider.subdomains || 'abc'}
      maxZoom={provider.maxZoom || 19}
      eventHandlers={{
        tileload: () => {
          loaded.current++;
          if (!settled.current) { settled.current = true; remember({ working: provider.id }); }
        },
        tileerror: () => {
          errors.current++;
          if (!loaded.current && errors.current >= 3) advance();
        },
      }}
    />
  );
}

/** Shown over a map whose tiles could not be loaded from any source. */
export function MapUnavailableNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="absolute inset-x-3 top-3 z-[500] rounded-xl bg-white/95 dark:bg-[#18181b]/95 border border-amber-300 dark:border-amber-500/40 p-3 text-xs text-amber-800 dark:text-amber-300 shadow" role="status">
      نقشه در حال حاضر بارگذاری نمی‌شود. {children}
    </div>
  );
}
