import React from 'react';
import { CalendarDays, Footprints, Sparkles, Store } from 'lucide-react';
import { navigate } from '../lib/router';
import { softPrice } from '../lib/format';
import { GeneratedAvatar } from './Avatar';
import { VibeChips } from './VibeChips';

// One suggestion from the "I'm bored" picker or the no-cost section: an event, a place that is
// open, or a walk. The reason line ("آروم و دنج · تا ۲۳:۰۰ بازه") matters more than the price.

export type Pick = {
  kind: 'event' | 'place' | 'vibe';
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  url: string;
  reason: string;
  vibes: string[];
  cost: number | null;
  free: boolean;
  startTime: string | null;
  distanceKm: number | null;
};

const KIND = {
  event: { label: 'برنامه', Icon: CalendarDays },
  place: { label: 'پاتوق', Icon: Store },
  vibe: { label: 'قدم زدن', Icon: Footprints },
};

/** Query string for the visitor's location (or city) used by the suggestion endpoints. */
export function locationQuery(city: string | undefined, loc: { lat: number; lng: number } | null) {
  const p = new URLSearchParams();
  if (city && city !== 'all') p.set('city', city);
  if (loc) { p.set('lat', String(loc.lat)); p.set('lng', String(loc.lng)); }
  return p;
}

export function PickCard({ pick, size = 'large' }: { pick: Pick; size?: 'large' | 'compact' }) {
  const { label, Icon } = KIND[pick.kind];
  const large = size === 'large';
  return (
    <button
      onClick={() => navigate(pick.url)}
      data-pick={`${pick.kind}:${pick.id}`}
      className={`text-right bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden flex hover:border-teal-500/50 dark:hover:border-[#d9ff00]/40 transition-colors ${large ? 'w-full gap-4 p-3' : 'w-64 shrink-0 gap-3 p-2.5'}`}
    >
      <div className={`${large ? 'w-24 h-24' : 'w-16 h-16'} rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-white/5`}>
        {pick.imageUrl
          ? <img src={pick.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
          : <GeneratedAvatar seed={`${pick.kind}-${pick.id}-${pick.title}`} className="w-full h-full" />}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <Icon className="w-3.5 h-3.5" /> {label}{pick.subtitle ? ` · ${pick.subtitle}` : ''}
        </span>
        <span className={`font-bold text-gray-900 dark:text-gray-100 ${large ? 'text-base' : 'text-sm truncate'}`}>{pick.title}</span>
        {pick.reason && (
          <span className={`text-xs text-teal-700 dark:text-[#d9ff00] flex items-start gap-1 ${large ? '' : 'line-clamp-2'}`}>
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {pick.reason}
          </span>
        )}
        {large && <VibeChips vibes={pick.vibes} max={2} className="mt-1" />}
        {pick.kind === 'event' && pick.cost !== null && <span className="text-[11px] text-gray-500 mt-auto">{softPrice(pick.cost)}</span>}
      </div>
    </button>
  );
}
