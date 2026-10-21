import React, { useEffect, useState } from 'react';
import { UserCheck, Inbox, Flag, RotateCcw, Check, X, EyeOff, Eye } from 'lucide-react';
import { api, showToast } from '../lib/apiClient';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { navigate } from '../lib/router';
import { formatToman, pNum, timeAgo } from '../lib/format';
import { KycReview } from './admin/KycReview';

// Everything an admin has to act on: organizer applications, content waiting for review,
// user reports and refund requests.

const TYPE_LABEL: Record<string, string> = { PLACE: 'پاتوق', VIBE: 'حال و هوا', FLOW: 'جریان', CHAIN: 'زنجیره', EVENT: 'رویداد', HUB: 'جامعه', USER: 'کاربر' };
const TARGET_PATH: Record<string, string> = { EVENT: '/events/', PLACE: '/places/', VIBE: '/vibes/', FLOW: '/flows/', CHAIN: '/chains/', HUB: '/hubs/' };

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        {icon} {title}
        <span className={`text-xs px-2 py-0.5 rounded-full ${count ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>{pNum(count)}</span>
      </h3>
      {count === 0 ? <p className="text-sm text-gray-500">موردی برای بررسی نیست.</p> : children}
    </section>
  );
}

export default function ModerationCenter() {
  const [requests, setRequests] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    api<{ data: any[] }>('/api/admin/organizer-requests', { silent: true }).then(d => setRequests(d.data)).catch(() => {});
    api<{ data: any[] }>('/api/admin/moderation', { silent: true }).then(d => setQueue(d.data)).catch(() => {});
    api<{ data: any[] }>('/api/admin/reports', { silent: true }).then(d => setReports(d.data)).catch(() => {});
    api<{ data: any[] }>('/api/admin/refunds', { silent: true }).then(d => setRefunds(d.data)).catch(() => {});
  };
  useEffect(load, []);

  const run = async (key: string, fn: () => Promise<any>, done: string) => {
    setBusy(key);
    try {
      await fn();
      showToast(done, 'success');
      load();
    } catch { /* toast shown */ } finally {
      setBusy(null);
    }
  };

  const decideOrganizer = async (user: any, action: 'approve' | 'reject') => {
    let reason: string | null = '';
    if (action === 'reject') {
      reason = await promptDialog({ title: `رد درخواست ${user.name}`, message: 'دلیل رد درخواست برای کاربر ارسال می‌شود (اختیاری).', multiline: true, minLength: 0, confirmText: 'رد درخواست', danger: true });
      if (reason === null) return;
    }
    run(`org-${user.id}`, () => api(`/api/admin/organizer-requests/${user.id}`, { body: { action, reason } }), action === 'approve' ? 'حساب برگزارکننده فعال شد.' : 'درخواست رد شد.');
  };

  const decideContent = async (item: any, action: 'approve' | 'reject') => {
    let reason: string | null = '';
    if (action === 'reject') {
      reason = await promptDialog({ title: `عدم انتشار «${item.title}»`, message: 'دلیل برای سازنده ارسال می‌شود (اختیاری).', multiline: true, minLength: 0, confirmText: 'رد', danger: true });
      if (reason === null) return;
    }
    run(`mod-${item.type}-${item.id}`, () => api(`/api/admin/moderation/${item.type.toLowerCase()}/${item.id}`, { body: { action, reason } }), action === 'approve' ? 'منتشر شد.' : 'رد شد.');
  };

  const actOnReport = async (report: any, action: 'hide' | 'dismiss') => {
    if (action === 'hide') {
      const ok = await confirmDialog({ title: 'پنهان کردن محتوا', message: `${TYPE_LABEL[report.targetType]} #${pNum(report.targetId)} از دید عموم پنهان شود؟ همه گزارش‌های مربوط به آن بسته می‌شوند.`, confirmText: 'پنهان کن', danger: true });
      if (!ok) return;
    }
    run(`rep-${report.id}`, () => api(`/api/admin/reports/${report.id}`, { body: { action } }), action === 'hide' ? 'محتوا پنهان شد.' : 'گزارش بسته شد.');
  };

  const markRefunded = async (row: any) => {
    const ok = await confirmDialog({ title: 'ثبت بازپرداخت', message: `مبلغ ${formatToman(row.refund.amount)} به ${row.userName} از پنل درگاه بازپرداخت شده است؟`, confirmText: 'بله، بازپرداخت شد' });
    if (!ok) return;
    run(`ref-${row.refund.id}`, () => api('/api/admin/refunds/mark-paid', { body: { ids: [row.refund.id] } }), 'بازپرداخت ثبت شد و به کاربر اطلاع داده شد.');
  };

  const markEventRefunded = async (eventId: number, title: string, rows: any[]) => {
    const total = rows.reduce((sum, r) => sum + r.refund.amount, 0);
    const ok = await confirmDialog({ title: 'ثبت بازپرداخت گروهی', message: `همه ${pNum(rows.length)} بازپرداخت «${title}» (جمعاً ${formatToman(total)}) از پنل درگاه انجام شده است؟`, confirmText: 'بله، همه انجام شد' });
    if (!ok) return;
    run(`refev-${eventId}`, () => api('/api/admin/refunds/mark-paid', { body: { eventId } }), 'بازپرداخت‌ها ثبت شد و به خریداران اطلاع داده شد.');
  };

  const refundsByEvent = refunds.reduce<Record<number, any[]>>((groups, r) => ((groups[r.refund.eventId] ||= []).push(r), groups), {});

  const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50';

  return (
    <div className="space-y-5" dir="rtl">
      <Section icon={<UserCheck className="w-5 h-5 text-teal-600" />} title="درخواست‌های برگزارکننده" count={requests.length}>
        <ul className="space-y-3">
          {requests.map(u => (
            <li key={u.id} className="border border-gray-100 dark:border-white/10 rounded-xl p-3">
              <div className="flex justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{u.name} <span className="text-xs text-gray-500 font-normal">{u.email} • {u.city}</span></p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{u.note}</p>
                  {(u.website || u.instagram) && <p className="text-xs text-gray-500 mt-1" dir="ltr">{[u.website, u.instagram].filter(Boolean).join(' • ')}</p>}
                </div>
                <div className="flex gap-2 items-start">
                  <button disabled={busy === `org-${u.id}`} onClick={() => decideOrganizer(u, 'approve')} className={`${btn} bg-emerald-600 text-white`}><Check className="w-4 h-4" /> تأیید</button>
                  <button disabled={busy === `org-${u.id}`} onClick={() => decideOrganizer(u, 'reject')} className={`${btn} bg-gray-100 dark:bg-white/10`}><X className="w-4 h-4" /> رد</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <KycReview />

      <Section icon={<Inbox className="w-5 h-5 text-indigo-500" />} title="محتوای در انتظار انتشار" count={queue.length}>
        <ul className="space-y-3">
          {queue.map(item => (
            <li key={`${item.type}-${item.id}`} className="border border-gray-100 dark:border-white/10 rounded-xl p-3 flex justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100"><span className="text-xs bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded px-1.5 py-0.5 ml-1">{TYPE_LABEL[item.type]}</span>{item.title}</p>
                {item.description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>}
                <p className="text-[11px] text-gray-400 mt-1">{timeAgo(item.createdAt)}</p>
              </div>
              <div className="flex gap-2 items-start">
                <button disabled={busy === `mod-${item.type}-${item.id}`} onClick={() => decideContent(item, 'approve')} className={`${btn} bg-emerald-600 text-white`}><Check className="w-4 h-4" /> انتشار</button>
                <button disabled={busy === `mod-${item.type}-${item.id}`} onClick={() => decideContent(item, 'reject')} className={`${btn} bg-gray-100 dark:bg-white/10`}><X className="w-4 h-4" /> رد</button>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={<Flag className="w-5 h-5 text-red-500" />} title="گزارش‌های تخلف" count={reports.length}>
        <ul className="space-y-3">
          {reports.map(r => (
            <li key={r.id} className="border border-gray-100 dark:border-white/10 rounded-xl p-3 flex justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{r.reason}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {TYPE_LABEL[r.targetType]}{' '}
                  {TARGET_PATH[r.targetType] ? <button onClick={() => navigate(`${TARGET_PATH[r.targetType]}${r.targetId}`)} className="underline">#{pNum(r.targetId)}</button> : `#${pNum(r.targetId)}`}
                  {' '}• گزارش‌دهنده: {r.reporterName || 'نامشخص'} • {timeAgo(r.createdAt)}
                </p>
                {r.details && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{r.details}</p>}
              </div>
              <div className="flex gap-2 items-start">
                <button disabled={busy === `rep-${r.id}`} onClick={() => actOnReport(r, 'hide')} className={`${btn} bg-red-600 text-white`}><EyeOff className="w-4 h-4" /> پنهان کن</button>
                <button disabled={busy === `rep-${r.id}`} onClick={() => actOnReport(r, 'dismiss')} className={`${btn} bg-gray-100 dark:bg-white/10`}><Eye className="w-4 h-4" /> مشکلی نیست</button>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={<RotateCcw className="w-5 h-5 text-amber-500" />} title="درخواست‌های بازپرداخت" count={refunds.length}>
        <div className="space-y-4">
          {(Object.entries(refundsByEvent) as [string, any[]][]).map(([eventId, rows]) => (
            <div key={eventId} className="border border-gray-100 dark:border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{rows[0].eventTitle} <span className="text-xs text-gray-500 font-normal">({pNum(rows.length)} مورد، {formatToman(rows.reduce((s: number, r: any) => s + r.refund.amount, 0))})</span></p>
                {rows.length > 1 && <button disabled={busy === `refev-${eventId}`} onClick={() => markEventRefunded(Number(eventId), rows[0].eventTitle, rows)} className={`${btn} bg-amber-500 text-black`}><Check className="w-4 h-4" /> همه بازپرداخت شد</button>}
              </div>
              <ul className="space-y-2">
                {rows.map((row: any) => (
                  <li key={row.refund.id} className="flex justify-between gap-3 flex-wrap text-xs border-t border-gray-100 dark:border-white/5 pt-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      {row.userName} {row.userPhone && <span dir="ltr">({row.userPhone})</span>} • <b>{formatToman(row.refund.amount)}</b> • {row.refund.reason === 'EVENT_CANCELLED' ? 'لغو رویداد' : row.refund.reason === 'EVENT_POSTPONED' ? 'تغییر زمان' : 'لغو خریدار'} • کد پیگیری درگاه: <span dir="ltr">{row.refId || '-'}</span>
                    </span>
                    <button disabled={busy === `ref-${row.refund.id}`} onClick={() => markRefunded(row)} className={`${btn} bg-gray-100 dark:bg-white/10`}><Check className="w-4 h-4" /> بازپرداخت شد</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
