import React, { useEffect, useRef, useState } from 'react';
import { Search, X, MapPin, Calendar, Tag, BadgePercent, SearchX } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import { Event } from '../types';
import { EventRow, groupEventsByDay } from './EventRow';
import { navigate } from '../lib/router';

// One-line search: «کنسرت آخر هفته در شیراز» -> the matching events. The text is read on the
// server (city, time, free/paid, keywords); the recognised parts are shown as chips.

interface Filters {
  city: string | null;
  from: string | null;
  to: string | null;
  when: string | null;
  price: 'free' | 'paid' | null;
  keywords: string[];
  keywordsDropped: boolean;
  correctedQuery?: string | null;
}

const EXAMPLES = ['کنسرت آخر هفته', 'رویدادهای رایگان امروز', 'تئاتر فردا در تهران', 'نمایشگاه این هفته اصفهان'];

export default function QuickSearch({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ q: string; events: Event[]; filters: Filters } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const latest = useRef(0);
  const search = async (text = input, typing = false) => {
    const q = text.trim();
    if (!q) return;
    if (!typing) setInput(q);
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: Event[]; filters: Filters }>(`/api/quick-search?q=${encodeURIComponent(q)}`, { silent: true });
      if (id !== latest.current) return; // a newer search is on its way
      setResult({ q, events: res.data, filters: res.filters });
    } catch (err) {
      if (id !== latest.current) return;
      setError(err instanceof ApiError && err.status === 429 ? 'چند ثانیه صبر کنید و دوباره جستجو کنید.' : 'جستجو انجام نشد. دوباره تلاش کنید.');
    } finally {
      if (id === latest.current) setLoading(false);
    }
  };

  // Results while typing (after a short pause), no need to press search.
  useEffect(() => {
    if (input.trim().length < 2) { setResult(null); return; }
    const t = setTimeout(() => search(input, true), 450);
    return () => clearTimeout(t);
  }, [input]);

  const open = (e: Event) => { onClose(); navigate(`/events/${e.id}`); };
  const f = result?.filters;
  const pill = 'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-teal-600/10 dark:bg-[#d9ff00]/10 text-teal-700 dark:text-[#d9ff00]';

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#141417] text-right" dir="rtl" role="dialog" aria-modal="true" aria-label="جستجوی سریع">
      <form onSubmit={(e) => { e.preventDefault(); search(); }} className="p-4 bg-white dark:bg-[#18181b] border-b border-gray-200 dark:border-white/10 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-[#1f1f23] rounded-full px-4 py-2.5 focus-within:ring-2 focus-within:ring-teal-600 dark:focus-within:ring-[#d9ff00]/50">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            aria-label="چه رویدادی، کجا، کی؟"
            placeholder="مثلاً: کنسرت آخر هفته در شیراز"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100"
          />
          {loading && <span className="w-4 h-4 rounded-full border-2 border-teal-600 dark:border-[#d9ff00] border-t-transparent animate-spin shrink-0" />}
        </div>
        <button type="button" onClick={onClose} aria-label="بستن" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        {!result && !error && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(x => (
              <button key={x} type="button" onClick={() => search(x)} className="text-sm px-3 py-1.5 rounded-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-teal-500">
                {x}
              </button>
            ))}
          </div>
        )}

        {result && f && (
          <>
            <div className="flex flex-wrap gap-1.5" aria-label="برداشت از جستجو">
              {f.city && <span className={pill}><MapPin className="w-3 h-3" />{f.city}</span>}
              {f.when && <span className={pill}><Calendar className="w-3 h-3" />{f.when}</span>}
              {f.price && <span className={pill}><BadgePercent className="w-3 h-3" />{f.price === 'free' ? 'رایگان' : 'پولی'}</span>}
              {f.keywords.map(k => <span key={k} className={`${pill} ${f.keywordsDropped ? 'line-through opacity-60' : ''}`}><Tag className="w-3 h-3" />{k}</span>)}
            </div>
            {f.correctedQuery && <p className="text-xs text-gray-600 dark:text-gray-400">نتیجه‌های «{f.correctedQuery}» رو نشونت دادیم.</p>}
            {f.keywordsDropped && <p className="text-xs text-amber-700 dark:text-amber-300">برای «{f.keywords.join(' ')}» چیزی پیدا نشد؛ بقیه رویدادهای همین شهر و زمان:</p>}

            {result.events.length === 0 ? (
              <div className="py-10 text-center text-gray-500 dark:text-gray-400 space-y-2">
                <SearchX className="w-10 h-10 mx-auto opacity-60" />
                <p>چیزی پیدا نشد.</p>
                <div className="flex justify-center gap-2 pt-2">
                  <button type="button" onClick={() => { onClose(); navigate('/bored'); }} className="px-3 py-2 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold">یه چیزی پیشنهاد بده</button>
                  <button type="button" onClick={() => { onClose(); navigate('/free'); }} className="px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-800 dark:text-gray-200">بدون خرج</button>
                </div>
              </div>
            ) : f.from ? (
              groupEventsByDay(result.events, f.from).map(g => (
                <section key={g.key} className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{g.title}</h3>
                  {g.events.map(e => <EventRow key={e.id} event={e} onSelect={open} />)}
                </section>
              ))
            ) : (
              <div className="space-y-2">{result.events.map(e => <EventRow key={e.id} event={e} onSelect={open} />)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
