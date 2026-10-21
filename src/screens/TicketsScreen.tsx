import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CreditCard, Calendar, CheckCircle, Bookmark, XCircle, Ticket, WifiOff, Clock } from 'lucide-react';
import { useAppData } from '../lib/appData';
import { useAuth } from '../lib/AuthContext';
import { api, showToast } from '../lib/apiClient';
import { confirmDialog } from '../lib/dialog';
import { navigate, useLocation } from '../lib/router';
import { EventCard } from '../components/EventCard';
import { eventTimeLabel, formatToman, pNum } from '../lib/format';

interface TicketRow {
  tickets: { id: number; code: string; status: 'ACTIVE' | 'USED' | 'CANCELLED' | 'PENDING_PAYMENT'; amount: number; holderLabel?: string; usedAt?: string };
  events: any;
  order?: { id: number; status: string } | null;
  canCancel: boolean;
  refund?: { status: 'REQUESTED' | 'PAID'; paidAt: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'معتبر', USED: 'استفاده شده', CANCELLED: 'لغو شده', PENDING_PAYMENT: 'در انتظار پرداخت' };

function TicketQr({ code }: { code: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    // The QR encodes the code only; the organizer's check-in screen accepts it as typed or scanned.
    QRCode.toDataURL(`MEVENT:${code}`, { margin: 1, width: 160, errorCorrectionLevel: 'M' }).then(setSrc).catch(() => setSrc(''));
  }, [code]);
  return src ? <img src={src} alt={`کد QR بلیت ${code}`} className="w-32 h-32 rounded-lg bg-white p-1" /> : <div className="w-32 h-32 rounded-lg bg-white/50 animate-pulse" />;
}

export function TicketsScreen() {
  const { dbUserId } = useAuth();
  const { rsvpEvents, savedEvents, refreshLists, refreshProfile } = useAppData();
  const { query } = useLocation();
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [offline, setOffline] = useState(false);
  const payment = query.get('payment');

  const load = () => {
    if (!dbUserId) return;
    api<{ data: TicketRow[] }>(`/api/users/${dbUserId}/tickets`, { silent: true })
      .then(d => { setTickets(d.data); setOffline(!navigator.onLine); })
      .catch(() => { setTickets(t => t || []); setOffline(true); });
  };

  useEffect(() => { load(); refreshLists(); }, [dbUserId]);

  useEffect(() => {
    if (payment === 'success') { showToast('پرداخت موفق بود و بلیت شما صادر شد.', 'success'); refreshProfile(); }
    if (payment === 'failed') showToast('پرداخت انجام نشد. مبلغی از حساب شما کسر نشده یا ظرف ۷۲ ساعت برمی‌گردد.', 'error');
  }, [payment]);

  const cancel = async (row: TicketRow) => {
    const paid = row.tickets.amount > 0;
    const ok = await confirmDialog({
      title: 'لغو بلیت',
      message: paid
        ? `بلیت «${row.events.title}» لغو و مبلغ ${formatToman(row.tickets.amount)} بازپرداخت می‌شود. این کار برگشت‌پذیر نیست.`
        : `بلیت «${row.events.title}» لغو شود؟`,
      confirmText: 'لغو بلیت',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api<any>(`/api/tickets/${row.tickets.id}/cancel`, { body: {} });
      showToast(res.message || 'بلیت لغو شد.', 'success');
      load();
      refreshLists();
      refreshProfile();
    } catch { /* toast shown */ }
  };

  const active = (tickets || []).filter(t => t.tickets.status === 'ACTIVE' || t.tickets.status === 'PENDING_PAYMENT');
  const past = (tickets || []).filter(t => t.tickets.status === 'USED' || t.tickets.status === 'CANCELLED');

  return (
    <div className="space-y-10">
      {payment && (
        <div className={`rounded-2xl p-4 border flex items-center gap-3 ${payment === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200' : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200'}`}>
          {payment === 'success' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          <span className="font-bold text-sm flex-1">{payment === 'success' ? 'پرداخت موفق بود؛ بلیت شما در پایین این صفحه است.' : 'پرداخت ناموفق بود. می‌توانید دوباره تلاش کنید.'}</span>
          <button onClick={() => navigate('/tickets', { replace: true })} className="text-xs underline">بستن</button>
        </div>
      )}

      <section>
        <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 mb-1 flex items-center gap-2"><Ticket className="w-5 h-5" /> بلیت‌های من</h2>
        <p className="text-xs text-gray-500 mb-4">کد QR را هنگام ورود به برگزارکننده نشان دهید.{offline ? ' (نمایش آفلاین از آخرین دریافت)' : ''}</p>
        {offline && <p className="text-xs flex items-center gap-1 text-amber-600 mb-3"><WifiOff className="w-4 h-4" /> اتصال برقرار نیست؛ آخرین اطلاعات ذخیره‌شده نمایش داده می‌شود.</p>}
        {tickets === null ? (
          <div className="h-32 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <CreditCard className="w-14 h-14 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">بلیت فعالی ندارید.</p>
            <button onClick={() => navigate('/')} className="mt-3 text-sm font-bold text-teal-600 dark:text-[#d9ff00]">کشف رویدادها</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map(row => (
              <div key={row.tickets.id} className="bg-teal-600/10 dark:bg-[#d9ff00]/10 rounded-2xl border border-teal-600/20 dark:border-[#d9ff00]/20 p-4 flex gap-4">
                {row.tickets.status === 'ACTIVE' ? <TicketQr code={row.tickets.code} /> : (
                  <div className="w-32 h-32 rounded-lg bg-white/60 dark:bg-white/5 flex flex-col items-center justify-center text-xs text-gray-600 gap-2"><Clock className="w-6 h-6" /> در انتظار پرداخت</div>
                )}
                <div className="flex-1 min-w-0">
                  <button onClick={() => navigate(`/events/${row.events.id}`)} className="font-bold text-[#515739] dark:text-gray-100 mb-1 text-right hover:underline">{row.events.title}</button>
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2"><Calendar className="w-3.5 h-3.5" /> {eventTimeLabel(row.events)}</p>
                  {(row.events as any).postponedFrom && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">زمان رویداد تغییر کرده است؛ تا پیش از زمان جدید می‌توانید بلیت را با بازپرداخت کامل لغو کنید.</p>
                  )}
                  <p className="text-xs font-mono tracking-widest bg-white dark:bg-black/30 rounded-lg px-2 py-1 inline-block mb-2" dir="ltr">{row.tickets.code}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{row.tickets.holderLabel || 'بلیت'} • {STATUS_LABEL[row.tickets.status]} • {row.tickets.amount ? formatToman(row.tickets.amount) : 'رایگان'}</p>
                  {row.canCancel && (
                    <button onClick={() => cancel(row)} className="mt-3 text-xs font-bold text-red-600 hover:underline">لغو بلیت</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm font-bold text-gray-600 dark:text-gray-400 cursor-pointer">بلیت‌های گذشته و لغوشده ({pNum(past.length)})</summary>
            <ul className="mt-3 space-y-2">
              {past.map(row => (
                <li key={row.tickets.id} className="text-sm flex justify-between bg-gray-100 dark:bg-white/5 rounded-xl px-3 py-2">
                  <span className="truncate">{row.events.title}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {(row.events as any).status === 'CANCELLED' ? 'رویداد لغو شد' : STATUS_LABEL[row.tickets.status]}
                    {row.refund?.status === 'REQUESTED' ? ' • در انتظار بازپرداخت' : row.refund?.status === 'PAID' ? ' • بازپرداخت شد' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> رویدادهایی که می‌روم</h2>
        {rsvpEvents.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 py-6 text-center">هنوز برای رویدادی ثبت‌نام نکرده‌اید.</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">{rsvpEvents.map(e => <EventCard key={e.id} event={e} />)}</div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 mb-4 flex items-center gap-2"><Bookmark className="w-5 h-5" /> رویدادهای نشان‌شده</h2>
        {savedEvents.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 py-6 text-center">هنوز رویدادی نشان نکرده‌اید.</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">{savedEvents.map(e => <EventCard key={e.id} event={e} />)}</div>
        )}
      </section>
    </div>
  );
}
