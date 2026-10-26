import React, { useEffect, useState } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import { api } from '../lib/apiClient';
import { navigate } from '../lib/router';
import { useAppData } from '../lib/appData';
import { Pick, PickCard, locationQuery } from '../components/Picks';

// "بدون خرج": free things to do, as a first-class section rather than a price filter.

export type FreeData = { today: Pick[]; openNow: Pick[]; walks: Pick[]; week: Pick[] };

export function useFreeData(city: string | undefined, userLocation: { lat: number; lng: number } | null) {
  const [data, setData] = useState<FreeData | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    api<FreeData>(`/api/free?${locationQuery(userLocation ? undefined : city, userLocation)}`, { silent: true, signal: ctrl.signal })
      .then(setData).catch(() => { if (!ctrl.signal.aborted) setData({ today: [], openNow: [], walks: [], week: [] }); });
    return () => ctrl.abort();
  }, [city, userLocation?.lat, userLocation?.lng]);
  return data;
}

const SECTIONS: { key: keyof FreeData; title: string; empty: string }[] = [
  { key: 'today', title: 'امروز، مجانی', empty: 'امروز برنامه‌ی مجانی دیگه‌ای نمونده.' },
  { key: 'openNow', title: 'الان بازه و ورودی نداره', empty: 'الان جایی با ورودی رایگان باز نیست.' },
  { key: 'walks', title: 'یه قدم زدن', empty: 'هنوز مسیر پیاده‌روی‌ای برای این شهر ثبت نشده.' },
  { key: 'week', title: 'این هفته، مجانی', empty: 'برای این هفته برنامه‌ی مجانی ثبت نشده.' },
];

export function FreeScreen({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const { profile } = useAppData();
  const data = useFreeData(profile?.city || 'تهران', userLocation);
  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <button onClick={() => navigate('/')} className="text-sm text-gray-500 flex items-center gap-1 py-2.5 -my-2"><ArrowRight className="w-4 h-4" /> خانه</button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Wallet className="w-6 h-6 text-teal-600 dark:text-[#d9ff00]" /> بدون خرج</h1>
        <p className="text-sm text-gray-500 mt-1">خوش گذروندن همیشه پول نمی‌خواد.</p>
      </div>
      {SECTIONS.map(s => (
        <section key={s.key} aria-label={s.title}>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">{s.title}</h2>
          {!data ? <div className="h-28 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
            : data[s.key].length === 0 ? <p className="text-sm text-gray-500">{s.empty}</p>
            : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{data[s.key].map(p => <PickCard key={`${p.kind}:${p.id}`} pick={p} />)}</div>}
        </section>
      ))}
    </div>
  );
}
