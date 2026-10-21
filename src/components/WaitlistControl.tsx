import React, { useEffect, useState } from 'react';
import { Hourglass, BellRing } from 'lucide-react';
import { api, ApiError, showToast } from '../lib/apiClient';
import { useAppData } from '../lib/appData';
import { pNum } from '../lib/format';
import { Event } from '../types';

// Waiting list for a full event: join / position / leave, and the "a seat is held for you" banner.

interface WaitlistState { status: 'WAITING' | 'OFFERED'; position: number; quantity: number; offerExpiresAt: string | null }

const timeFormat = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });

export function WaitlistBanner({ waitlist }: { waitlist: WaitlistState | null }) {
  if (waitlist?.status !== 'OFFERED' || !waitlist.offerExpiresAt) return null;
  return (
    <p role="status" className="text-sm mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-3 py-2 flex items-center gap-2">
      <BellRing className="w-4 h-4 shrink-0" /> {waitlist.quantity > 1 ? 'دو جا' : 'یک جا'} تا ساعت {timeFormat.format(new Date(waitlist.offerExpiresAt))} برایتان نگه داشته شده؛ همین حالا ثبت‌نام کنید.
    </p>
  );
}

export function WaitlistControl({ event, waitlist, onChange }: { event: Event; waitlist: WaitlistState | null; onChange: (w: WaitlistState | null) => void }) {
  const { requireLogin } = useAppData();
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (!requireLogin()) return;
    setBusy(true);
    try {
      const res = await api<{ data: WaitlistState; message: string }>(`/api/events/${event.id}/waitlist`, { body: {} });
      onChange(res.data);
      showToast(res.message, 'success');
    } catch (err) {
      if (err instanceof ApiError && err.data?.code === 'SEATS_AVAILABLE') window.location.reload();
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    setBusy(true);
    try {
      await api(`/api/events/${event.id}/waitlist`, { method: 'DELETE' });
      onChange(null);
      showToast('از لیست انتظار خارج شدید.', 'info');
    } catch { /* toast shown */ } finally {
      setBusy(false);
    }
  };

  if (waitlist?.status === 'WAITING') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
        <span className="text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2"><Hourglass className="w-4 h-4" /> در لیست انتظار هستید (نفر {pNum(waitlist.position)})</span>
        <button disabled={busy} onClick={leave} className="text-xs font-bold text-amber-800 dark:text-amber-300 underline disabled:opacity-50">خروج</button>
      </div>
    );
  }
  return (
    <button disabled={busy} onClick={join} className="w-full py-4 rounded-xl font-bold border-2 border-teal-600 dark:border-[#d9ff00] text-teal-700 dark:text-[#d9ff00] flex items-center justify-center gap-2 disabled:opacity-60">
      <Hourglass className="w-5 h-5" /> عضویت در لیست انتظار
    </button>
  );
}

export function useWaitlist(event: Event) {
  const [waitlist, setWaitlist] = useState<WaitlistState | null>((event as any).waitlist || null);
  useEffect(() => { setWaitlist((event as any).waitlist || null); }, [event.id, (event as any).waitlist?.status]);
  return [waitlist, setWaitlist] as const;
}
