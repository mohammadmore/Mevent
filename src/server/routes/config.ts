import { Express } from 'express';
import { asyncRoute } from '../infra.ts';
import { getSiteInfo } from '../siteInfo.ts';
import { CANCEL_DEADLINE_HOURS, PAYMENT_HOLD_MINUTES, FRIEND_TICKET_DISCOUNT } from './commerce.ts';
import { POINT_VALUE_TOMAN, MAX_POINTS_SHARE } from '../../lib/points.ts';

// Public, non-secret settings the browser needs.

interface TileProvider { id: string; url: string; attribution: string; subdomains?: string; maxZoom?: number }

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Map tile sources, tried in order by the browser until one loads:
 *   MAP_TILE_URLS   own/Iranian tile servers ("{z}/{x}/{y}" templates, separated by "|"),
 *   MAPIR_API_KEY   Map.ir raster tiles,
 *   then CARTO and OpenStreetMap.
 */
export function tileProviders(): TileProvider[] {
  const list: TileProvider[] = [];
  const own = (process.env.MAP_TILE_URLS || '').split('|').map(s => s.trim()).filter(u => /^https?:\/\/|^\//.test(u));
  own.forEach((url, i) => list.push({ id: `own${i}`, url, attribution: process.env.MAP_TILE_ATTRIBUTION || OSM_ATTRIBUTION, maxZoom: 19 }));
  if (process.env.MAPIR_API_KEY) {
    list.push({
      id: 'mapir',
      url: `https://map.ir/shiveh/xyz/1.0.0/Shiveh:Shiveh@EPSG:3857@png/{z}/{x}/{y}.png?x-api-key=${encodeURIComponent(process.env.MAPIR_API_KEY)}`,
      attribution: '&copy; <a href="https://map.ir">Map.ir</a>',
      maxZoom: 19,
    });
  }
  list.push(
    { id: 'carto', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: `${OSM_ATTRIBUTION} &copy; CARTO`, subdomains: 'abcd', maxZoom: 20 },
    { id: 'osm', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: OSM_ATTRIBUTION, maxZoom: 19 },
  );
  return list;
}

export function registerConfigRoutes(app: Express) {
  // Business details + the rules the legal pages quote (taken from the code so they never drift).
  app.get('/api/site-info', asyncRoute(async (_req, res) => {
    res.json({
      data: {
        ...(await getSiteInfo()),
        rules: {
          cancelDeadlineHours: CANCEL_DEADLINE_HOURS,
          paymentHoldMinutes: PAYMENT_HOLD_MINUTES,
          friendDiscountPercent: Math.round(FRIEND_TICKET_DISCOUNT * 100),
          pointValueToman: POINT_VALUE_TOMAN,
          maxPointsSharePercent: Math.round(MAX_POINTS_SHARE * 100),
        },
      },
    });
  }));

  app.get('/api/config/maps', (_req, res) => {
    res.json({ data: { tiles: tileProviders() } });
  });
}
