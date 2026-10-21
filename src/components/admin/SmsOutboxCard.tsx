import React, { useEffect, useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { api, showToast } from '../../lib/apiClient';
import { pNum } from '../../lib/format';

const LABELS: Record<string, string> = { SENT: 'ارسال‌شده', PENDING: 'در صف', SENDING: 'در حال ارسال', FAILED: 'ناموفق', SKIPPED: 'بدون الگو' };
const KIND_LABELS: Record<string, string> = { TICKET: 'بلیت', REMINDER: 'یادآوری', EVENT_CANCELLED: 'لغو رویداد', EVENT_POSTPONED: 'تعویق', REFUND: 'بازپرداخت', WAITLIST: 'لیست انتظار', TRANSFER: 'انتقال بلیت' };

export function SmsOutboxCard() {
  const [data, setData] = useState<{ counts: Record<string, number>; problems: any[] } | null>(null);
  const load = () => api<{ data: any }>('/api/admin/sms', { silent: true }).then(d => setData(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const retryAll = async () => {
    const ids = (data?.problems || []).filter(p => p.status === 'FAILED').map(p => p.id);
    if (!ids.length) return;
    const res = await api<{ data: { retried: number } }>('/api/admin/sms/retry', { body: { ids } });
    showToast(`${pNum(res.data.retried)} پیامک دوباره در صف قرار گرفت.`, 'success');
    setTimeout(load, 1500);
  };

  return (
    <div className="bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-sm space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-500 font-bold">
        <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-teal-600" /> پیامک‌ها (۷ روز اخیر)</span>
        <button onClick={load} aria-label="به‌روزرسانی" className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(data?.counts || {}).map(([k, v]) => (
          <span key={k} className={`px-2 py-1 rounded-full ${k === 'FAILED' ? 'bg-rose-500/10 text-rose-600' : k === 'SENT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-600'}`}>{LABELS[k] || k}: {pNum(v)}</span>
        ))}
        {data && !Object.keys(data.counts).length && <span className="text-gray-400">پیامکی ارسال نشده است.</span>}
      </div>
      {!!data?.problems.length && (
        <>
          <ul className="space-y-1 text-xs max-h-40 overflow-y-auto">
            {data.problems.slice(0, 10).map(p => (
              <li key={p.id} className="flex justify-between gap-2" title={p.lastError || ''}>
                <span>{KIND_LABELS[p.kind] || p.kind} · <span dir="ltr">{p.phone}</span></span>
                <span className="text-rose-600 truncate max-w-[50%]">{p.status === 'SKIPPED' ? 'الگو تعریف نشده' : p.lastError}</span>
              </li>
            ))}
          </ul>
          {data.problems.some(p => p.status === 'FAILED') && (
            <button onClick={retryAll} className="text-xs font-bold text-teal-600 dark:text-[#d9ff00]">ارسال دوباره ناموفق‌ها</button>
          )}
        </>
      )}
    </div>
  );
}
