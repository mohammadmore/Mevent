import React, { useState } from 'react';
import { CalendarClock, Ban, X } from 'lucide-react';
import { api, showToast } from '../lib/apiClient';
import { pNum, formatToman } from '../lib/format';
import { Event } from '../types';

// Organizer actions for an event people already signed up for: reschedule or cancel.
// Both notify every ticket holder and RSVP (in-app, push and SMS).

const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function EventChangeActions({ event, onChanged }: { event: Event; onChanged: () => void }) {
  const [mode, setMode] = useState<'postpone' | 'cancel' | null>(null);
  const [start, setStart] = useState(() => isoLocal(new Date(Date.now() + 7 * 86400000)));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if ((event as any).status === 'CANCELLED') {
    return <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">این رویداد لغو شده است{(event as any).cancelReason ? `: ${(event as any).cancelReason}` : ''}.</p>;
  }
  const ended = event.startTime && new Date((event as any).endTime || event.startTime).getTime() < Date.now();
  if (ended) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'cancel') {
        const res = await api<any>(`/api/organizer/events/${event.id}/cancel`, { body: { reason } });
        showToast(`رویداد لغو شد. ${pNum(res.data.notified)} نفر باخبر شدند${res.data.refundTotal ? `؛ ${formatToman(res.data.refundTotal)} در صف بازپرداخت است` : ''}.`, 'success');
      } else {
        const res = await api<any>(`/api/organizer/events/${event.id}/postpone`, { body: { startTime: new Date(start).toISOString(), reason } });
        showToast(`زمان جدید ثبت شد و ${pNum(res.data.notified)} نفر باخبر شدند.`, 'success');
      }
      setMode(null);
      setReason('');
      onChanged();
    } catch { /* toast shown */ } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {event.startTime && <button onClick={() => setMode('postpone')} className="px-3 py-2 rounded-xl text-sm font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> تغییر زمان</button>}
        <button onClick={() => setMode('cancel')} className="px-3 py-2 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 flex items-center gap-1.5"><Ban className="w-4 h-4" /> لغو رویداد</button>
      </div>
      {mode && (
        <form onSubmit={submit} className="rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3 relative">
          <button type="button" onClick={() => setMode(null)} aria-label="بستن" className="absolute left-3 top-3 text-gray-400"><X className="w-4 h-4" /></button>
          <p className="font-bold text-sm">{mode === 'cancel' ? 'لغو رویداد' : 'تغییر زمان رویداد'}</p>
          {mode === 'postpone' && (
            <label className="block"><span className="block text-xs text-gray-500 mb-1">زمان جدید شروع</span>
              <input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-sm" dir="ltr" /></label>
          )}
          <label className="block"><span className="block text-xs text-gray-500 mb-1">{mode === 'cancel' ? 'دلیل لغو (برای شرکت‌کنندگان ارسال می‌شود)' : 'توضیح (اختیاری)'}</span>
            <textarea required={mode === 'cancel'} minLength={mode === 'cancel' ? 5 : 0} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-sm" /></label>
          <p className="text-xs text-gray-500 leading-relaxed">
            {mode === 'cancel'
              ? 'همه بلیت‌ها باطل و مبلغ بلیت‌های پرداختی بدون درخواست خریدار بازگردانده می‌شود. این کار برگشت‌پذیر نیست.'
              : 'به همه شرکت‌کنندگان خبر داده می‌شود و دارندگان بلیت تا پیش از زمان جدید می‌توانند بلیت را با بازپرداخت کامل لغو کنند.'}
          </p>
          <button disabled={busy} className={`px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${mode === 'cancel' ? 'bg-red-600' : 'bg-amber-600'}`}>{busy ? 'در حال ثبت...' : mode === 'cancel' ? 'لغو قطعی رویداد' : 'ثبت زمان جدید'}</button>
        </form>
      )}
    </div>
  );
}
