import React, { useEffect, useState } from 'react';
import { ChevronLeft, Heart, Wallet } from 'lucide-react';
import { Event } from '../types';
import { api, showToast } from '../lib/apiClient';
import { navigate } from '../lib/router';
import { useAppData } from '../lib/appData';
import { MOODS } from '../lib/moods';
import { tehranParts } from '../lib/time';
import { EventCard } from './EventCard';
import { PickCard, locationQuery } from './Picks';
import { useFreeData } from '../screens/FreeScreen';

// The top of the home screen: a greeting that asks how you feel, picks made for you, and things
// that cost nothing. Filters and the full list come after.

type Loc = { lat: number; lng: number } | null;

function greeting() {
  const h = tehranParts(new Date()).hour;
  if (h >= 5 && h < 11) return 'صبح بخیر';
  if (h >= 11 && h < 16) return 'روز بخیر';
  if (h >= 16 && h < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

export function HomeGreeting() {
  const { profile } = useAppData();
  const name = profile?.name?.trim().split(/\s+/)[0];
  return (
    <section className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-teal-50 dark:from-[#d9ff00]/10 dark:via-white/5 dark:to-teal-500/10 border border-amber-200/60 dark:border-white/10">
      <p className="text-sm text-gray-600 dark:text-gray-400">{greeting()}{name ? `، ${name}` : ''} 👋</p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">امروز حوصله‌ت چی می‌خواد؟</h1>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-4 -mx-1 px-1 pb-1">
        {Object.entries(MOODS).map(([key, m]) => (
          <button key={key} onClick={() => navigate(`/bored?mood=${key}`)}
            className="shrink-0 px-3 py-2 rounded-full bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-gray-200 hover:border-teal-500 dark:hover:border-[#d9ff00]/50">
            <span aria-hidden>{m.emoji}</span> {m.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <button onClick={() => navigate('/bored')} className="flex-1 py-3.5 rounded-2xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold shadow-sm">
          حوصله‌م سر رفته، یه چیزی پیشنهاد بده
        </button>
        <button onClick={() => navigate('/free')} className="sm:w-40 py-3.5 rounded-2xl bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center justify-center gap-1.5">
          <Wallet className="w-4 h-4" /> بدون خرج
        </button>
      </div>
    </section>
  );
}

function RowHeader({ title, subtitle, Icon, more }: { title: string; subtitle?: string; Icon: typeof Heart; more?: () => void }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Icon className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" /> {title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {more && <button onClick={more} className="text-xs font-bold text-teal-600 dark:text-[#d9ff00] flex items-center px-2 py-2.5 -my-2">همه <ChevronLeft className="w-4 h-4" /></button>}
    </div>
  );
}

export function ForYouRow({ city, userLocation }: { city?: string; userLocation: Loc }) {
  const { profile, profileLoaded } = useAppData();
  const [data, setData] = useState<{ personalized: boolean; data: Event[] } | null>(null);
  useEffect(() => {
    if (!profileLoaded) return; // wait until we know who is asking: one request, not two
    const ctrl = new AbortController();
    const p = locationQuery(userLocation ? undefined : city, userLocation);
    p.set('limit', '12');
    api<{ personalized: boolean; data: Event[] }>(`/api/for-you?${p}`, { silent: true, signal: ctrl.signal }).then(setData).catch(() => {});
    return () => ctrl.abort();
  }, [city, userLocation?.lat, userLocation?.lng, profile?.id, profileLoaded]);

  const dismiss = (event: Event) => {
    setData(d => d && { ...d, data: d.data.filter(e => e.id !== event.id) });
    if (!profile) return;
    api('/api/interactions', { body: { eventId: event.id, type: 'NOT_INTERESTED' }, silent: true })
      .then(() => showToast('باشه، از این دست کمتر نشونت می‌دیم.', 'info')).catch(() => {});
  };

  if (!data || data.data.length === 0) return null;
  return (
    <section aria-label="برای تو">
      <RowHeader title="برای تو" Icon={Heart}
        subtitle={data.personalized ? 'از روی چیزهایی که دیدی و دوست داشتی' : 'هرچی بیشتر بگردی و ذخیره کنی، بهتر می‌شناسیمت'} />
      <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-2 snap-x">
        {data.data.map(e => (
          <div key={e.id} className="w-[290px] shrink-0 snap-start"><EventCard event={e} userLocation={userLocation} onDismiss={dismiss} /></div>
        ))}
      </div>
    </section>
  );
}

export function FreeRow({ city, userLocation }: { city?: string; userLocation: Loc }) {
  const data = useFreeData(city, userLocation);
  if (!data) return null;
  const mix = [...data.today.slice(0, 4), ...data.openNow.slice(0, 3), ...data.walks.slice(0, 3)];
  if (mix.length === 0) return null;
  return (
    <section aria-label="بدون خرج">
      <RowHeader title="بدون خرج" subtitle="مجانی، همین امروز" Icon={Wallet} more={() => navigate('/free')} />
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-2">
        {mix.map(p => <PickCard key={`${p.kind}:${p.id}`} pick={p} size="compact" />)}
      </div>
    </section>
  );
}
