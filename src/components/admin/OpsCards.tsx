import React, { useEffect, useState } from 'react';
import { Bug, DatabaseBackup, Download, Check, LifeBuoy } from 'lucide-react';
import { api, showToast } from '../../lib/apiClient';
import { pNum, timeAgo } from '../../lib/format';
import { SupportThread, STATUS, SUPPORT_CATEGORIES } from '../../screens/SupportScreen';

// Admin cards: grouped errors, database backups, and the support queue.

const card = 'bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-sm space-y-3';

export function ErrorsCard() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => api<{ data: any[] }>('/api/admin/errors', { silent: true }).then(d => setRows(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const resolve = async (id: number) => { await api(`/api/admin/errors/${id}/resolve`, { body: {} }).catch(() => {}); load(); };
  return (
    <div className={card}>
      <p className="text-sm font-bold text-gray-500 flex items-center gap-2"><Bug className="w-4 h-4 text-rose-500" /> خطاهای باز ({pNum(rows.length)})</p>
      {rows.length === 0 ? <p className="text-xs text-gray-400">خطای بازی ثبت نشده است.</p> : (
        <ul className="space-y-2 max-h-64 overflow-y-auto text-xs">
          {rows.map(e => (
            <li key={e.id} className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
              <details className="min-w-0">
                <summary className="cursor-pointer"><span className="font-mono">{e.source === 'client' ? 'مرورگر' : e.source === 'job' ? 'کار پس‌زمینه' : 'سرور'}</span> · {e.message.slice(0, 90)} <span className="text-gray-400">({pNum(e.count)} بار، {timeAgo(e.lastSeen)})</span></summary>
                <pre dir="ltr" className="whitespace-pre-wrap text-[10px] text-gray-500 mt-1">{e.path}{'\n'}{e.stack}</pre>
              </details>
              <button onClick={() => resolve(e.id)} aria-label="حل شد" title="حل شد" className="shrink-0 text-emerald-600"><Check className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BackupsCard() {
  const [data, setData] = useState<{ enabled: boolean; backups: any[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<{ data: any }>('/api/admin/backups', { silent: true }).then(d => setData(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const runNow = async () => {
    setBusy(true);
    try { await api('/api/admin/backups', { body: {} }); showToast('نسخه پشتیبان گرفته شد.', 'success'); } catch { /* toast shown */ }
    setBusy(false);
    load();
  };
  // Fetched with the admin's credentials (a plain link would not carry a Google sign-in token).
  const download = async (b: any) => {
    try {
      const res = await fetch(`/api/admin/backups/${b.id}/download`);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: b.fileName });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      showToast('دانلود نسخه پشتیبان انجام نشد.', 'error');
    }
  };
  const last = data?.backups.find(b => b.status === 'DONE');
  const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-500 flex items-center gap-2"><DatabaseBackup className="w-4 h-4 text-indigo-500" /> پشتیبان‌گیری پایگاه داده</p>
        <button disabled={busy} onClick={runNow} className="text-xs font-bold text-teal-600 dark:text-[#d9ff00] disabled:opacity-50">{busy ? 'در حال گرفتن...' : 'همین حالا'}</button>
      </div>
      <p className="text-xs text-gray-500">{data?.enabled === false ? 'پشتیبان‌گیری خودکار خاموش است.' : last ? `آخرین نسخه سالم: ${timeAgo(last.finishedAt)} (${last.location === 'local' ? 'فقط روی سرور' : 'روی سرور و فضای ابری'})` : 'هنوز نسخه‌ای گرفته نشده است.'}</p>
      <ul className="space-y-1 text-xs max-h-48 overflow-y-auto">
        {data?.backups.slice(0, 8).map(b => (
          <li key={b.id} className="flex items-center justify-between gap-2" title={b.error || ''}>
            <span className={b.status === 'FAILED' ? 'text-rose-600' : ''}>{timeAgo(b.startedAt)} · {b.kind === 'MANUAL' ? 'دستی' : 'خودکار'} · {b.status === 'DONE' ? size(b.sizeBytes) : b.status === 'FAILED' ? `ناموفق: ${String(b.error).slice(0, 60)}` : b.status === 'EXPIRED' ? 'حذف‌شده (قدیمی)' : 'در حال انجام'}</span>
            {b.status === 'DONE' && <button onClick={() => download(b)} className="text-teal-600 dark:text-[#d9ff00]" aria-label="دانلود"><Download className="w-4 h-4" /></button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SupportAdmin() {
  const [status, setStatus] = useState<'OPEN' | 'ANSWERED' | 'CLOSED'>('OPEN');
  const [rows, setRows] = useState<any[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  useEffect(() => { api<{ data: any[] }>(`/api/admin/support?status=${status}`, { silent: true }).then(d => setRows(d.data)).catch(() => {}); }, [status, openId]);
  if (openId) {
    return <div className={card}><SupportThread id={openId} backTo="/admin" onBack={() => setOpenId(null)} /></div>;
  }
  return (
    <div className={card}>
      <p className="font-bold flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-teal-600" /> درخواست‌های پشتیبانی</p>
      <div className="flex gap-2">
        {(['OPEN', 'ANSWERED', 'CLOSED'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`text-xs px-3 py-1.5 rounded-full ${status === s ? STATUS[s].cls + ' font-bold' : 'bg-gray-50 dark:bg-white/5'}`}>{STATUS[s].label}</button>
        ))}
      </div>
      {rows.length === 0 ? <p className="text-sm text-gray-500">موردی نیست.</p> : (
        <ul className="divide-y divide-gray-100 dark:divide-white/5">
          {rows.map(t => (
            <li key={t.id}><button onClick={() => setOpenId(t.id)} className="w-full text-right py-3 text-sm">
              <span className="font-bold">{t.subject}</span> <span className="text-xs text-gray-500">— {t.userName} · {SUPPORT_CATEGORIES[t.category]} · {timeAgo(t.lastMessageAt)}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
