import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, Calendar, MapPin, X, Clock, Share2, Bookmark, Search, PlusCircle, Trash2, CalendarX } from 'lucide-react';
import { Event, Place } from '../types';
import JalaliCalendarPicker from './JalaliCalendarPicker';
import { EventRow, groupEventsByDay } from './EventRow';
import { useAuth } from '../lib/AuthContext';
import { useAppData } from '../lib/appData';
import { api, showToast } from '../lib/apiClient';
import { confirmDialog } from '../lib/dialog';
import { absoluteUrl } from '../lib/router';
import { pNum } from '../lib/format';

// Trip planner: pick a destination and travel dates, see the events on in that city during the
// trip, day by day. Plans can be saved to the account and shared by link.

interface TripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
  onSelectEvent?: (event: Event) => void;
  onSelectPlace?: (place: Place) => void;
  /** Opens a saved/shared trip from /trips/:id. */
  sharedTripId?: string;
}

interface TripPlan {
  id?: string;
  isOwner?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  title?: string;
  city: string;
  startDate: string;
  endDate: string;
  events: Event[];
}

const LEGACY_STORAGE_KEY = 'saved_trip_packages';
// The last result survives closing the modal (e.g. to look at an event and come back).
let lastPlan: TripPlan | null = null;

const POPULAR_CITIES = ['تهران', 'شیراز', 'اصفهان', 'مشهد', 'تبریز', 'کیش', 'رشت', 'یزد', 'کاشان'];

const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' });
const shortDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', day: 'numeric', month: 'long' });
const dayIso = (offsetDays = 0) => isoDay.format(new Date(Date.now() + offsetDays * 86400_000));

function rangeLabel(plan: Pick<TripPlan, 'startDate' | 'endDate'>) {
  const a = shortDay.format(new Date(plan.startDate)), b = shortDay.format(new Date(plan.endDate));
  return a === b ? a : `${a} تا ${b}`;
}

export default function TripPlannerModal({ isOpen, onClose, onSelectEvent, sharedTripId }: TripPlannerModalProps) {
  const { dbUserId } = useAuth();
  const { requireLogin } = useAppData();
  const [city, setCity] = useState('تهران');
  const [customCity, setCustomCity] = useState('');
  const [startDate, setStartDate] = useState(() => dayIso(0));
  const [endDate, setEndDate] = useState(() => dayIso(2));

  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<TripPlan | null>(() => (sharedTripId ? null : lastPlan));
  const [isSaved, setIsSaved] = useState(() => Boolean(!sharedTripId && lastPlan?.id));
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingShared, setLoadingShared] = useState(Boolean(sharedTripId));
  const [viewMode, setViewMode] = useState<'form' | 'result' | 'list'>(() => (sharedTripId || lastPlan ? 'result' : 'form'));
  // Saved trips live on the server (all devices); trips saved in this browser by older versions are migrated once.
  const [savedPlans, setSavedPlans] = useState<TripPlan[]>([]);

  useEffect(() => { lastPlan = plan; }, [plan]);

  useEffect(() => {
    if (!dbUserId) { setSavedPlans([]); return; }
    (async () => {
      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
        if (Array.isArray(legacy) && legacy.length > 0) {
          for (const pkg of legacy) {
            const { id, ...data } = pkg;
            await api('/api/trips', { body: { data, isPublic: false }, silent: true }).catch(() => {});
          }
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      } catch { /* ignore broken local data */ }
      api<{ data: TripPlan[] }>('/api/trips', { silent: true }).then(d => {
        setSavedPlans(d.data);
        if (!sharedTripId && !lastPlan && d.data.length > 0) setViewMode('list');
      }).catch(() => {});
    })();
  }, [dbUserId]);

  useEffect(() => {
    if (!sharedTripId) return;
    setLoadingShared(true);
    api<{ data: TripPlan }>(`/api/trips/${sharedTripId}`, { silent: true })
      .then(d => { openPlan(d.data, Boolean(d.data.isOwner)); })
      .catch(() => { showToast('این برنامه سفر پیدا نشد یا خصوصی است.', 'error'); setViewMode('form'); })
      .finally(() => setLoadingShared(false));
  }, [sharedTripId]);

  const fetchEvents = (targetCity: string, from: string, to: string) =>
    api<{ data: TripPlan }>('/api/trip-planner', { body: { city: targetCity, startDate: from, endDate: to } }).then(d => d.data);

  /** Shows a saved plan right away, then refreshes its events (new, changed or cancelled ones). */
  const openPlan = (saved: TripPlan, owned: boolean) => {
    setPlan(saved);
    setIsSaved(owned);
    setViewMode('result');
    if (saved.city && saved.startDate && saved.endDate && new Date(saved.endDate).getTime() > Date.now() - 86400_000) {
      fetchEvents(saved.city, isoDay.format(new Date(saved.startDate)), isoDay.format(new Date(saved.endDate)))
        .then(fresh => setPlan(p => (p && p.id === saved.id ? { ...p, events: fresh.events } : p)))
        .catch(() => {});
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const targetCity = customCity.trim() || city;
    if (!targetCity || !startDate) return;
    setIsLoading(true);
    try {
      const data = await fetchEvents(targetCity, startDate, endDate || startDate);
      setPlan({ ...data, title: `سفر به ${data.city}` });
      setIsSaved(false);
      setViewMode('result');
    } catch {
      // error toast already shown
    } finally {
      setIsLoading(false);
    }
  };

  /** Saves the plan to the user's account; returns its id. */
  const saveTrip = async (opts: { isPublic?: boolean } = {}) => {
    if (!plan || !requireLogin()) return null;
    const { id, isOwner, isPublic, createdAt, ...data } = plan;
    const ownId = isSaved && id ? id : undefined;
    const res = await api<{ data: TripPlan }>('/api/trips', { body: { id: ownId, data, isPublic: opts.isPublic ?? true } });
    setPlan(res.data);
    setIsSaved(true);
    setSavedPlans(prev => [res.data, ...prev.filter(p => p.id !== res.data.id)]);
    return res.data.id as string;
  };

  const handleSave = async () => {
    try {
      const id = await saveTrip();
      if (id) showToast('برنامه سفر در حساب شما ذخیره شد.', 'success');
    } catch { /* toast shown */ }
  };

  const handleShare = async () => {
    try {
      // A trip link needs a saved, public trip behind it.
      const id = plan?.id && (isSaved || plan.isPublic) ? plan.id : await saveTrip({ isPublic: true });
      if (!id || !plan) return;
      const url = absoluteUrl(`/trips/${id}`);
      if (navigator.share) {
        await navigator.share({ title: plan.title || `سفر به ${plan.city}`, text: `${pNum(plan.events.length)} رویداد در ${plan.city}، ${rangeLabel(plan)}`, url }).catch(() => {});
      } else {
        await navigator.clipboard?.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch { /* toast shown */ }
  };

  const deleteTrip = async (saved: TripPlan) => {
    const ok = await confirmDialog({ title: 'حذف برنامه سفر', message: `برنامه «${saved.title || saved.city}» حذف شود؟`, confirmText: 'حذف', danger: true });
    if (!ok) return;
    try {
      await api(`/api/trips/${saved.id}`, { method: 'DELETE' });
      setSavedPlans(prev => prev.filter(p => p.id !== saved.id));
      if (plan?.id === saved.id) { setPlan(null); setViewMode('form'); }
    } catch { /* toast shown */ }
  };

  const newTrip = () => { setPlan(null); setViewMode('form'); };

  if (!isOpen) return null;

  const chip = (active: boolean) => `px-4 py-2 rounded-xl text-sm font-medium transition-colors ${active
    ? 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold'
    : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'}`;
  const quickRange = (days: number) => { setStartDate(dayIso(0)); setEndDate(dayIso(days - 1)); };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto" dir="rtl" role="dialog" aria-modal="true" aria-label="برنامه‌ریزی سفر">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          <div className="p-5 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-700 dark:from-[#18181b] dark:via-[#222226] dark:to-[#18181b] border-b border-white/10 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 dark:bg-[#d9ff00]/20 flex items-center justify-center text-white dark:text-[#d9ff00] border border-white/20">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">برنامه سفر</h2>
                <p className="text-xs text-teal-100 dark:text-gray-400 mt-0.5">رویدادهای شهر مقصد در روزهای سفر</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {savedPlans.length > 0 && viewMode !== 'list' && (
                <button onClick={() => setViewMode('list')} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2">
                  <Bookmark className="w-4 h-4" /> سفرهای من ({pNum(savedPlans.length)})
                </button>
              )}
              <button onClick={onClose} aria-label="بستن" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 overflow-y-auto flex-1">
            {loadingShared ? (
              <div className="py-16 flex justify-center"><div className="w-10 h-10 rounded-full border-4 border-teal-600/20 border-t-teal-600 animate-spin" /></div>
            ) : viewMode === 'result' && plan ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-white/5 border border-teal-100 dark:border-white/10">
                  <div className="space-y-1">
                    <h3 className="font-black text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2"><MapPin className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />{plan.city}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{rangeLabel(plan)} · {pNum(plan.events.length)} رویداد</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${isSaved ? 'bg-emerald-600 text-white' : 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black'}`}>
                      <Bookmark className="w-4 h-4" /> {isSaved ? 'ذخیره شد' : plan.isOwner === false ? 'ذخیره در سفرهای من' : 'ذخیره'}
                    </button>
                    <button onClick={handleShare} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-[#222226] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                      <Share2 className="w-4 h-4" /> {copiedLink ? 'لینک کپی شد' : 'اشتراک‌گذاری'}
                    </button>
                  </div>
                </div>

                {plan.events.length === 0 ? (
                  <div className="py-10 text-center space-y-2 text-gray-500 dark:text-gray-400">
                    <CalendarX className="w-10 h-10 mx-auto opacity-60" />
                    <p className="font-bold text-gray-700 dark:text-gray-300">در این روزها رویدادی در {plan.city} ثبت نشده است.</p>
                    <p className="text-sm">تاریخ یا شهر دیگری را امتحان کنید.</p>
                  </div>
                ) : (
                  groupEventsByDay(plan.events, plan.startDate).map(group => (
                    <section key={group.key} className="space-y-2">
                      <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600 dark:text-[#d9ff00]" /> {group.title}
                        <span className="text-xs font-normal text-gray-400">({pNum(group.events.length)})</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.events.map(evt => <EventRow key={evt.id} event={evt} onSelect={onSelectEvent} />)}
                      </div>
                    </section>
                  ))
                )}

                <button type="button" onClick={newTrip} className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold text-sm flex items-center justify-center gap-2">
                  <PlusCircle className="w-4 h-4" /> سفر جدید
                </button>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">سفرهای ذخیره‌شده</h3>
                  <button onClick={newTrip} className="px-4 py-2 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black rounded-xl text-sm font-bold flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> سفر جدید
                  </button>
                </div>
                {savedPlans.length === 0 ? (
                  <p className="text-sm text-gray-500">هیچ سفری ذخیره نشده است.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedPlans.map(saved => (
                      <div key={saved.id} role="button" tabIndex={0} onClick={() => openPlan(saved, true)} onKeyDown={e => e.key === 'Enter' && openPlan(saved, true)}
                        className="border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex items-start justify-between gap-3 bg-gray-50 dark:bg-white/5 cursor-pointer hover:border-teal-500 dark:hover:border-[#d9ff00]">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100"><MapPin className="w-4 h-4 text-teal-600 dark:text-[#d9ff00]" />{saved.city}</div>
                          {saved.startDate && saved.endDate && <div className="text-xs text-gray-600 dark:text-gray-400">{rangeLabel(saved)}</div>}
                          <div className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {pNum((saved.events || []).length)} رویداد</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteTrip(saved); }} aria-label="حذف برنامه سفر" className="text-red-500 p-1 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600 dark:text-[#d9ff00]" /> شهر مقصد
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_CITIES.map(c => (
                      <button key={c} type="button" onClick={() => { setCity(c); setCustomCity(''); }} className={chip(city === c && !customCity)}>{c}</button>
                    ))}
                  </div>
                  <input
                    type="text"
                    aria-label="شهر دیگر"
                    placeholder="یا نام شهر دیگری را بنویسید"
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#222226] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-600 dark:focus:border-[#d9ff00]"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600 dark:text-[#d9ff00]" /> تاریخ سفر
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => quickRange(1)} className={chip(false)}>فقط امروز</button>
                    <button type="button" onClick={() => quickRange(3)} className={chip(false)}>۳ روز</button>
                    <button type="button" onClick={() => quickRange(7)} className={chip(false)}>یک هفته</button>
                  </div>
                  <JalaliCalendarPicker startDateIso={startDate} endDateIso={endDate} onChangeRange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Search className="w-5 h-5" />}
                  رویدادهای {customCity.trim() || city} را نشان بده
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
