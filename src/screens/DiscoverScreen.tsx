import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, MapPin, Plane, Sparkles, X, RefreshCw, Store } from 'lucide-react';
import { Event } from '../types';
import DiscoveryHeader from '../components/DiscoveryHeader';
import { EventCard } from '../components/EventCard';
import { useAppData } from '../lib/appData';
import { api } from '../lib/apiClient';
import { navigate, useLocation } from '../lib/router';
import { tehranDayRange, tehranWeekendRange, addDays, startOfTehranDay } from '../lib/time';
import { pNum, placeTypeLabel } from '../lib/format';
import { SiteFooter } from '../components/SiteFooter';
import { ForYouRow, FreeRow, HomeGreeting } from '../components/HomeRows';

export const CITIES = ['تهران', 'اصفهان', 'شیراز', 'مشهد', 'تبریز', 'کرج', 'رشت', 'یزد', 'کیش', 'قم', 'اهواز', 'کرمان'];
const PAGE_SIZE = 12;

type DateFilter = 'all' | 'today' | 'weekend' | 'week';
type PriceFilter = 'all' | 'free' | 'paid';

function dateRange(filter: DateFilter): [Date, Date] | null {
  if (filter === 'today') return tehranDayRange();
  if (filter === 'weekend') return tehranWeekendRange();
  if (filter === 'week') { const s = startOfTehranDay(); return [s, addDays(s, 7)]; }
  return null;
}

interface Props {
  userLocation: { lat: number; lng: number } | null;
  onPlanTrip: () => void;
  onOpenPlace: (place: any) => void;
  onOpenFlow: (flow: any) => void;
  onOpenVibe: (vibe: any) => void;
  onOpenChain: (chain: any) => void;
}

export function DiscoverScreen({ userLocation, onPlanTrip, onOpenPlace, onOpenFlow, onOpenVibe, onOpenChain }: Props) {
  const { profile } = useAppData();
  const { query } = useLocation();
  const [categories, setCategories] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(query.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);

  // Filters live in the URL, so they survive refresh, work with Back and can be shared.
  const q = query.get('q') || '';
  const type = (query.get('type') || 'all') as 'all' | 'events' | 'places';
  const category = query.get('cat') || 'all';
  const price = (query.get('price') || 'all') as PriceFilter;
  const date = (query.get('date') || 'all') as DateFilter;
  const radius = parseInt(query.get('radius') || '20', 10);
  const city = query.get('city') || profile?.city || 'تهران';

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(query);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '' || v === 'all' && k !== 'city') next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    navigate(s ? `/?${s}` : '/', { replace: true });
  };

  // Debounce typing into the URL (and therefore into the request).
  useEffect(() => {
    const t = setTimeout(() => { if (searchInput.trim() !== q) setParam({ q: searchInput.trim() || null }); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    api<{ data: any }>('/api/admin/settings', { silent: true })
      .then(d => setCategories(Array.isArray(d.data?.event_categories) ? d.data.event_categories : []))
      .catch(() => {});
  }, []);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category !== 'all') p.set('tag', category);
    if (price !== 'all') p.set('price', price);
    const range = dateRange(date);
    if (range) { p.set('from', range[0].toISOString()); p.set('to', range[1].toISOString()); }
    if (userLocation) {
      // "Near me" replaces the city filter (the user may be travelling), personalisation stays on.
      p.set('lat', String(userLocation.lat)); p.set('lng', String(userLocation.lng)); p.set('radius', String(radius));
    } else if (city !== 'all') {
      p.set('city', city);
    }
    if (q && type !== 'all') p.set('type', type);
    return p.toString();
  }, [q, category, price, date, userLocation, radius, city, type]);

  const [events, setEvents] = useState<Event[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [corrected, setCorrected] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const load = async (offset: number) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      if (q) {
        const res = await api<any>(`/api/search?${params}&limit=${PAGE_SIZE}&offset=${offset}`, { silent: true });
        if (id !== requestId.current) return;
        setEvents(prev => offset ? [...prev, ...res.events] : res.events);
        if (offset === 0) { setPlaces(res.places); setCorrected(res.correctedQuery || null); }
        setHasMore(type === 'places' ? false : res.hasMoreEvents);
      } else {
        const res = await api<any>(`/api/events?${params}&limit=${PAGE_SIZE}&offset=${offset}`, { silent: true });
        if (id !== requestId.current) return;
        setEvents(prev => offset ? [...prev, ...res.data] : res.data);
        setPlaces([]);
        setCorrected(null);
        setHasMore(res.hasMore);
      }
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => { load(0); }, [params]);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading) load(events.length);
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, events.length, params]);

  const filtersActive = price !== 'all' || date !== 'all';
  const chip = (active: boolean) => `px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${active ? 'bg-gray-800 dark:bg-[#d9ff00] text-white dark:text-black' : 'bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`;

  const searchBox = (
      <div className="relative">
        <Search className="absolute right-3 top-3 w-5 h-5 text-gray-500" />
        <input
          type="search"
          inputMode="search"
          aria-label="جستجو"
          placeholder="جستجوی رویداد، پاتوق، دسته‌بندی..."
          className="w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl pr-10 pl-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-[#d9ff00]/30"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button onClick={() => { setSearchInput(''); setParam({ q: null, type: null }); }} aria-label="پاک کردن جستجو" className="absolute left-3 top-3 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

  );

  return (
    <div className="space-y-6">
      {!q && (
        <>
          <HomeGreeting />
          <ForYouRow city={city === 'all' ? undefined : city} userLocation={userLocation} />
          <FreeRow city={city === 'all' ? undefined : city} userLocation={userLocation} />
        </>
      )}
      {!q && <DiscoveryHeader city={city === 'all' ? undefined : city} onFlowSelect={onOpenFlow} onVibeSelect={onOpenVibe} onChainSelect={onOpenChain} />}

      {!q && (
        <div className="bg-gradient-to-r from-teal-800 via-emerald-700 to-teal-900 dark:from-[#d9ff00]/15 dark:via-emerald-500/10 dark:to-teal-500/15 border border-teal-600/30 dark:border-[#d9ff00]/30 rounded-2xl p-4 text-white dark:text-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 dark:bg-[#d9ff00]/20 flex items-center justify-center shrink-0"><Plane className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-base">برنامه‌ریزی هوشمند سفر</h3>
              <p className="text-xs text-teal-100 dark:text-gray-300 mt-0.5">شهر، تاریخ و علایقت رو بگو؛ پکیج رویدادها و پاتوق‌ها رو یکجا تحویل بگیر!</p>
            </div>
          </div>
          <button onClick={onPlanTrip} className="w-full sm:w-auto bg-white text-teal-900 dark:bg-[#d9ff00] dark:text-black font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
            <Sparkles className="w-4 h-4" /> چیدن پکیج سفر
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {searchBox}
        {q && (
          <div className="flex gap-2" role="tablist">
            {([['all', 'همه نتایج'], ['events', 'رویدادها'], ['places', 'پاتوق‌ها']] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={type === key} onClick={() => setParam({ type: key })} className={`px-3 py-1 rounded-full text-xs ${type === key ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>{label}</button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 flex items-center gap-2">
            {q ? `نتایج «${q}»` : 'همه برنامه‌ها'}
            <button onClick={() => load(0)} aria-label="بروزرسانی" className={`p-2.5 -m-1 rounded-full text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </h2>
          <div className="flex items-center gap-2">
            {userLocation ? (
              <span className="text-xs font-bold text-teal-600 dark:text-[#d9ff00] flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> اطراف شما</span>
            ) : (
              <select
                aria-label="شهر"
                value={city}
                onChange={(e) => setParam({ city: e.target.value })}
                className="text-sm bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-full px-3 py-1.5 outline-none"
              >
                <option value="all">همه شهرها</option>
                {[...new Set([profile?.city, ...CITIES].filter(Boolean) as string[])].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-bold border ${showFilters || filtersActive ? 'bg-teal-600/10 dark:bg-[#d9ff00]/10 border-teal-600/30 dark:border-[#d9ff00]/30 text-teal-600 dark:text-[#d9ff00]' : 'bg-white/90 dark:bg-[#18181b] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}>
              <Filter className="w-3.5 h-3.5" /> فیلترها{filtersActive ? ' •' : ''}
            </button>
            <button onClick={() => navigate('/map')} className="flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 px-3 py-2.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" /> نقشه
            </button>
          </div>
        </div>

        {q && corrected && (
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-white/5 rounded-xl px-3 py-2" role="status">
            برای «{q}» چیزی نبود؛ نتیجه‌های <b>«{corrected}»</b> رو نشونت دادیم.
          </p>
        )}

        {showFilters && (
          <div className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-xl space-y-4">
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 block">هزینه</span>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'free', 'paid'] as const).map(t => <button key={t} onClick={() => setParam({ price: t })} className={chip(price === t)}>{t === 'all' ? 'همه' : t === 'free' ? 'رایگان' : 'پولی'}</button>)}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 block">زمان (به وقت تهران)</span>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'today', 'weekend', 'week'] as const).map(t => <button key={t} onClick={() => setParam({ date: t })} className={chip(date === t)}>{{ all: 'همه زمان‌ها', today: 'امروز', weekend: 'آخر هفته (پنجشنبه و جمعه)', week: '۷ روز آینده' }[t]}</button>)}
              </div>
              {date !== 'all' && <p className="text-[11px] text-gray-500 mt-2">رویدادهای چندروزه و رویدادهای با زمان شناور (مثل «هر جمعه») هم نمایش داده می‌شوند.</p>}
            </div>
            {userLocation && (
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 block">شعاع جستجو</span>
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 20, 50].map(r => <button key={r} onClick={() => setParam({ radius: String(r) })} className={chip(radius === r)}>{pNum(r)} کیلومتر</button>)}
                </div>
              </div>
            )}
          </div>
        )}

        {!q && categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
            {['all', ...categories].map(cat => (
              <button key={cat} onClick={() => setParam({ cat })} className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none group" aria-pressed={category === cat}>
                {category === cat && <motion.div layoutId="active-category" className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-0 shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                <span className={`relative z-10 ${category === cat ? 'text-white dark:text-black font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{cat === 'all' ? 'همه' : cat}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {places.length > 0 && type !== 'events' && (
        <section>
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2"><Store className="w-4 h-4" /> پاتوق‌ها</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {places.map(p => (
              <button key={p.id} onClick={() => onOpenPlace(p)} className="text-right bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-3 flex gap-3 items-center hover:border-teal-500/50">
                {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="w-14 h-14 rounded-xl object-cover" /> : <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center"><Store className="w-6 h-6 text-gray-400" /></div>}
                <span className="min-w-0">
                  <span className="block font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{p.name}</span>
                  <span className="block text-xs text-gray-500 truncate">{p.city} • {p.address || placeTypeLabel(p.type)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {type !== 'places' && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6">
          {loading && events.length === 0 && Array(6).fill(0).map((_, i) => (
            <div key={'skeleton-' + i} className="break-inside-avoid rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#18181b] overflow-hidden animate-pulse mb-4">
              <div className="w-full h-40 bg-teal-100 dark:bg-white/10" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-teal-100 dark:bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-teal-100 dark:bg-white/10 rounded w-full" />
              </div>
            </div>
          ))}
          {events.map(event => <EventCard key={event.id} event={event} userLocation={userLocation} />)}
        </div>
      )}

      {error && (
        <div className="py-10 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-3">دریافت رویدادها با خطا مواجه شد.</p>
          <button onClick={() => load(0)} className="px-4 py-2 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold">تلاش دوباره</button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (type === 'places' ? places.length === 0 : true) && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-1">{q ? 'نتیجه‌ای یافت نشد' : 'رویدادی یافت نشد'}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {userLocation ? `در شعاع ${pNum(radius)} کیلومتری شما رویدادی نیست.` : city !== 'all' ? `با این فیلترها رویدادی در ${city} پیدا نکردیم.` : 'با این فیلترها نتیجه‌ای پیدا نکردیم.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {(filtersActive || category !== 'all' || city !== 'all' || q) && (
              <button onClick={() => { setSearchInput(''); navigate(`/?city=all`, { replace: true }); }} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-sm font-bold text-gray-800 dark:text-gray-200">همه‌ی برنامه‌ها</button>
            )}
            <button onClick={() => navigate('/bored')} className="px-3 py-2 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold">یه چیزی پیشنهاد بده</button>
            <button onClick={() => navigate('/free')} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-sm font-bold text-gray-800 dark:text-gray-200">بدون خرج</button>
          </div>
        </div>
      )}

      <div ref={sentinel} />
      {hasMore && (
        <div className="flex justify-center pb-6">
          <button onClick={() => load(events.length)} disabled={loading} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-sm font-bold text-gray-700 dark:text-gray-300 disabled:opacity-50">
            {loading ? 'در حال بارگذاری...' : 'نمایش بیشتر'}
          </button>
        </div>
      )}
      {!hasMore && !loading && <SiteFooter />}
    </div>
  );
}
