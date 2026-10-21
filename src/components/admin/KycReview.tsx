import React, { useEffect, useState } from 'react';
import { BadgeCheck, Check, X, FileText } from 'lucide-react';
import { api, showToast } from '../../lib/apiClient';
import { promptDialog } from '../../lib/dialog';
import { pNum, timeAgo } from '../../lib/format';

// Admin review of organizer identity documents.

const LABELS: Record<string, string> = {
  fullName: 'نام', nationalId: 'کد ملی', birthDate: 'تاریخ تولد', sheba: 'شبا',
  companyName: 'نام شرکت', companyId: 'شناسه ملی', registrationNumber: 'شماره ثبت', ceoName: 'مدیرعامل', ceoNationalId: 'کد ملی مدیرعامل',
};
const DOCS: Record<string, string> = { idCardImage: 'کارت ملی', gazetteImage: 'روزنامه رسمی' };

/** Documents are private: fetched with the admin's credentials and opened as a local blob. */
async function openDocument(name: string) {
  const win = window.open('', '_blank');
  try {
    const res = await fetch(`/api/kyc/documents/${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url; else window.location.href = url;
  } catch {
    win?.close();
    showToast('باز کردن مدرک انجام نشد.', 'error');
  }
}

export function KycReview() {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const load = () => api<{ data: any[] }>('/api/admin/kyc?status=PENDING', { silent: true }).then(d => setItems(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const decide = async (u: any, action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') {
      const r = await promptDialog({ title: 'دلیل رد مدارک', message: 'به کاربر نمایش داده می‌شود تا مدارک را اصلاح کند.', placeholder: 'مثلاً: تصویر کارت ملی خوانا نیست', confirmText: 'رد مدارک' });
      if (!r) return;
      reason = r;
    }
    setBusy(u.id);
    try {
      await api(`/api/admin/kyc/${u.id}`, { body: { action, reason } });
      showToast(action === 'approve' ? 'برگزارکننده تأیید شد.' : 'مدارک رد شد.', 'success');
      setItems(prev => prev.filter(x => x.id !== u.id));
    } catch { /* toast shown */ } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-teal-600" /> احراز هویت برگزارکنندگان
        <span className={`text-xs px-2 py-0.5 rounded-full ${items.length ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>{pNum(items.length)}</span>
      </h3>
      {items.length === 0 ? <p className="text-sm text-gray-500">موردی برای بررسی نیست.</p> : (
        <ul className="space-y-3">
          {items.map(u => (
            <li key={u.id} className="border border-gray-100 dark:border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex justify-between gap-3 flex-wrap">
                <p className="font-bold text-sm">{u.name} <span className="text-xs text-gray-500 font-normal">{u.type === 'COMPANY' ? 'حقوقی' : 'حقیقی'} • <span dir="ltr">{u.fullPhone}</span> • {timeAgo(u.submittedAt)}</span></p>
                <div className="flex gap-2">
                  <button disabled={busy === u.id} onClick={() => decide(u, 'approve')} className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-emerald-600 text-white disabled:opacity-50"><Check className="w-4 h-4" /> تأیید</button>
                  <button disabled={busy === u.id} onClick={() => decide(u, 'reject')} className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-gray-100 dark:bg-white/10 disabled:opacity-50"><X className="w-4 h-4" /> رد</button>
                </div>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {Object.entries(u.data || {}).filter(([k, v]) => LABELS[k] && v).map(([k, v]) => (
                  <div key={k}><dt className="text-gray-500 inline">{LABELS[k]}: </dt><dd className="inline font-mono" dir="auto">{String(v)}</dd></div>
                ))}
              </dl>
              <div className="flex gap-2">
                {Object.entries(DOCS).filter(([k]) => u.data?.[k]).map(([k, label]) => (
                  <button key={k} onClick={() => openDocument(u.data[k])} className="text-xs font-bold text-teal-700 dark:text-[#d9ff00] flex items-center gap-1"><FileText className="w-4 h-4" /> {label}</button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500">تطبیق شماره موبایل با کد ملی (شاهکار) را پیش از تأیید بررسی کنید.</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
