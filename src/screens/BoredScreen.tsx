import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, RefreshCw, RotateCcw, Wallet } from 'lucide-react';
import { api } from '../lib/apiClient';
import { navigate, useLocation } from '../lib/router';
import { useAppData } from '../lib/appData';
import { BUDGET_OPTIONS, COMPANY, MOODS, WHEN_OPTIONS } from '../lib/moods';
import { Pick, PickCard, locationQuery } from '../components/Picks';

// "حوصله‌م سر رفته": four quick questions (mood, when, with whom, budget), one tap each, then
// three picks. "یه چیز دیگه" asks again without what was already shown. Answers live in the
// URL, so Back steps through the questions and a result can be shared.

type Option = { key: string; label: string; emoji?: string };
const ANY = 'any';

const STEPS: { param: string; question: string; options: Option[]; skip?: string }[] = [
  {
    param: 'mood', question: 'امروز حال و هوات چیه؟', skip: 'هرچی، فقط یه کاری کنیم',
    options: Object.entries(MOODS).map(([key, v]) => ({ key, label: v.label, emoji: v.emoji })),
  },
  {
    param: 'when', question: 'کِی؟',
    options: Object.entries(WHEN_OPTIONS).map(([key, label]) => ({ key, label, emoji: { now: '⏱️', tonight: '🌙', tomorrow: '☀️', weekend: '🗓️' }[key] })),
  },
  {
    param: 'company', question: 'با کی؟', skip: 'فرقی نمی‌کنه',
    options: Object.entries(COMPANY).map(([key, v]) => ({ key, label: v.short, emoji: v.emoji })),
  },
  {
    param: 'budget', question: 'چقدر می‌خوای خرج کنی؟',
    options: Object.entries(BUDGET_OPTIONS).map(([key, label]) => ({ key, label, emoji: { free: '🆓', cheap: '🪙', any: '💳' }[key] })),
  },
];

export function BoredScreen({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const { profile } = useAppData();
  const { query } = useLocation();
  const answers = Object.fromEntries(STEPS.map(s => [s.param, query.get(s.param) || '']));
  const step = STEPS.findIndex(s => !answers[s.param]);
  const done = step === -1;

  const answer = (param: string, value: string) => {
    const next = new URLSearchParams(query);
    next.set(param, value);
    navigate(`/bored?${next}`);
  };

  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState(false);
  const shown = useRef<string[]>([]);
  const city = profile?.city || 'تهران';
  const key = STEPS.map(s => answers[s.param]).join('|');

  const load = async (more: boolean) => {
    if (!more) shown.current = [];
    setPicks(null);
    setError(false);
    const p = locationQuery(userLocation ? undefined : city, userLocation);
    for (const s of STEPS) if (answers[s.param] && answers[s.param] !== ANY) p.set(s.param, answers[s.param]);
    if (shown.current.length) p.set('exclude', shown.current.join(','));
    try {
      const res = await api<{ picks: Pick[]; remaining: number }>(`/api/suggest?${p}`, { silent: true });
      shown.current.push(...res.picks.map(x => `${x.kind}:${x.id}`));
      setPicks(res.picks);
      setRemaining(res.remaining);
    } catch {
      setError(true);
    }
  };

  useEffect(() => { if (done) load(false); }, [done, key, userLocation?.lat, userLocation?.lng]);

  const restart = () => navigate('/bored');
  const card = 'max-w-xl mx-auto w-full bg-white/90 dark:bg-[#18181b] rounded-3xl p-5 sm:p-7 shadow-sm border border-gray-200 dark:border-white/10';

  if (!done) {
    const s = STEPS[step];
    return (
      <div className={card}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => (step === 0 ? navigate('/') : history.back())} className="text-sm text-gray-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> {step === 0 ? 'خانه' : 'قبلی'}</button>
          <div className="flex gap-1.5" aria-label={`سؤال ${step + 1} از ${STEPS.length}`}>
            {STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-6 bg-teal-600 dark:bg-[#d9ff00]' : 'w-3 bg-gray-200 dark:bg-white/10'}`} />)}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-5">{s.question}</h1>
        <div className="grid grid-cols-2 gap-3" role="list">
          {s.options.map(o => (
            <button key={o.key} role="listitem" onClick={() => answer(s.param, o.key)}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-teal-500 dark:hover:border-[#d9ff00]/60 px-3 py-4 text-sm font-bold text-gray-800 dark:text-gray-100 flex flex-col items-center gap-2">
              {o.emoji && <span className="text-2xl" aria-hidden>{o.emoji}</span>}
              {o.label}
            </button>
          ))}
        </div>
        {s.skip && <button onClick={() => answer(s.param, ANY)} className="mt-4 w-full text-sm text-gray-500 py-2">{s.skip}</button>}
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> خانه</button>
        <button onClick={restart} className="text-sm text-gray-500 flex items-center gap-1"><RotateCcw className="w-4 h-4" /> از اول</button>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">اینا رو امتحان کن</h1>
      <p className="text-sm text-gray-500 mb-5">
        {[answers.mood !== ANY && MOODS[answers.mood as keyof typeof MOODS]?.label, WHEN_OPTIONS[answers.when as keyof typeof WHEN_OPTIONS],
          answers.company !== ANY && COMPANY[answers.company as keyof typeof COMPANY]?.short, answers.budget === 'free' && 'بدون خرج'].filter(Boolean).join(' · ')}
      </p>

      {picks === null && !error && <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>}
      {error && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-3">الان نتونستیم پیشنهاد بیاریم.</p>
          <button onClick={() => load(false)} className="px-4 py-2 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold">دوباره</button>
        </div>
      )}
      {picks && picks.length > 0 && <div className="space-y-3">{picks.map(p => <PickCard key={`${p.kind}:${p.id}`} pick={p} />)}</div>}
      {picks && picks.length === 0 && (
        <div className="text-center py-8 space-y-3">
          <p className="text-gray-700 dark:text-gray-300">{shown.current.length ? 'دیگه چیزی با این حال و هوا نداریم.' : 'با این انتخاب‌ها چیزی پیدا نکردیم.'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {answers.when !== 'weekend' && <button onClick={() => answer('when', 'weekend')} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-sm">آخر هفته چی؟</button>}
            {answers.mood !== ANY && <button onClick={() => answer('mood', ANY)} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-sm">هر حال و هوایی</button>}
            <button onClick={() => navigate('/free')} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-sm flex items-center gap-1"><Wallet className="w-4 h-4" /> بدون خرج</button>
          </div>
        </div>
      )}
      {picks && picks.length > 0 && remaining > 0 && (
        <button onClick={() => load(true)} className="mt-5 w-full py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> یه چیز دیگه
        </button>
      )}
    </div>
  );
}
