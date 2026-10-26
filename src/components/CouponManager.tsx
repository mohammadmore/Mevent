import React, { useEffect, useState } from 'react';
import { TicketPercent, Plus, X } from 'lucide-react';
import { api, showToast } from '../lib/apiClient';
import { formatToman, pNum } from '../lib/format';
import { Event } from '../types';

// Discount codes for the organizer's events (admins can also make site-wide codes).

interface Coupon {
  id: number; code: string; type: 'PERCENT' | 'AMOUNT'; value: number; maxDiscount: number | null; minAmount: number;
  maxUses: number | null; usedCount: number; perUserLimit: number; startsAt: string | null; endsAt: string | null;
  active: boolean; eventTitle: string | null; scope: 'SITE' | 'EVENT' | 'ORGANIZER'; totalDiscount: number;
}

const input = 'w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#18181b]';
const EMPTY = { code: '', type: 'PERCENT', value: '', maxDiscount: '', minAmount: '', maxUses: '', perUserLimit: '1', endsAt: '', scope: 'ORGANIZER', eventId: '' };

export function CouponManager({ events, isAdmin }: { events: Event[]; isAdmin: boolean }) {
  const [list, setList] = useState<Coupon[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api<{ data: Coupon[] }>('/api/organizer/coupons', { silent: true }).then(d => setList(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const paidEvents = events.filter(e => e.cost > 0);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/organizer/coupons', {
        body: {
          ...f,
          scope: f.eventId ? 'EVENT' : f.scope,
          eventId: f.eventId || undefined,
          endsAt: f.endsAt ? new Date(`${f.endsAt}T23:59:59+03:30`).toISOString() : undefined,
        },
      });
      showToast(`کد ${f.code.toUpperCase()} ساخته شد.`, 'success');
      setF(EMPTY);
      setOpen(false);
      load();
    } catch { /* toast shown */ } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Coupon) => {
    await api(`/api/organizer/coupons/${c.id}`, { method: 'PATCH', body: { active: !c.active } }).catch(() => {});
    load();
  };

  const describe = (c: Coupon) => c.type === 'PERCENT'
    ? `${pNum(c.value)}٪${c.maxDiscount ? ` (تا ${formatToman(c.maxDiscount)})` : ''}`
    : formatToman(c.value);

  return (
    <section className="bg-white/90 dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><TicketPercent className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" /> کدهای تخفیف</h3>
        <button onClick={() => setOpen(!open)} className="text-sm font-bold text-teal-600 dark:text-[#d9ff00] flex items-center gap-1 px-2 py-2.5 -my-2">{open ? <><X className="w-4 h-4" /> بستن</> : <><Plus className="w-4 h-4" /> کد جدید</>}</button>
      </div>

      {open && (
        <form onSubmit={create} className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
          <label className="col-span-2"><span className="block text-xs text-gray-500 mb-1">کد (حروف لاتین و عدد)</span><input required dir="ltr" className={`${input} font-mono uppercase`} value={f.code} onChange={set('code')} placeholder="NOWRUZ1405" /></label>
          <label><span className="block text-xs text-gray-500 mb-1">نوع</span>
            <select className={input} value={f.type} onChange={set('type')}><option value="PERCENT">درصدی</option><option value="AMOUNT">مبلغ ثابت (تومان)</option></select></label>
          <label><span className="block text-xs text-gray-500 mb-1">{f.type === 'PERCENT' ? 'درصد' : 'مبلغ (تومان)'}</span><input required dir="ltr" inputMode="numeric" className={input} value={f.value} onChange={set('value')} /></label>
          {f.type === 'PERCENT' && <label><span className="block text-xs text-gray-500 mb-1">سقف تخفیف (اختیاری)</span><input dir="ltr" inputMode="numeric" className={input} value={f.maxDiscount} onChange={set('maxDiscount')} /></label>}
          <label><span className="block text-xs text-gray-500 mb-1">حداقل مبلغ خرید</span><input dir="ltr" inputMode="numeric" className={input} value={f.minAmount} onChange={set('minAmount')} /></label>
          <label><span className="block text-xs text-gray-500 mb-1">تعداد کل (خالی = نامحدود)</span><input dir="ltr" inputMode="numeric" className={input} value={f.maxUses} onChange={set('maxUses')} /></label>
          <label><span className="block text-xs text-gray-500 mb-1">بار برای هر نفر</span><input dir="ltr" inputMode="numeric" className={input} value={f.perUserLimit} onChange={set('perUserLimit')} /></label>
          <label><span className="block text-xs text-gray-500 mb-1">اعتبار تا (اختیاری)</span><input type="date" className={input} value={f.endsAt} onChange={set('endsAt')} /></label>
          <label className="col-span-2"><span className="block text-xs text-gray-500 mb-1">برای</span>
            <select className={input} value={f.eventId || f.scope} onChange={(e) => { const v = e.target.value; setF({ ...f, eventId: /^\d+$/.test(v) ? v : '', scope: /^\d+$/.test(v) ? 'EVENT' : v }); }}>
              <option value="ORGANIZER">همه رویدادهای من</option>
              {isAdmin && <option value="SITE">همه رویدادهای سایت</option>}
              {paidEvents.map(ev => <option key={ev.id} value={ev.id}>فقط «{ev.title}»</option>)}
            </select></label>
          <div className="col-span-2 sm:col-span-4"><button disabled={saving} className="px-5 py-2 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold disabled:opacity-60">{saving ? 'در حال ساخت...' : 'ساخت کد'}</button></div>
        </form>
      )}

      {list.length === 0 ? <p className="text-sm text-gray-500">هنوز کد تخفیفی نساخته‌اید.</p> : (
        <ul className="divide-y divide-gray-100 dark:divide-white/5">
          {list.map(c => (
            <li key={c.id} className={`py-3 flex items-center justify-between gap-3 ${c.active ? '' : 'opacity-50'}`}>
              <div className="min-w-0">
                <p className="font-mono font-bold text-sm" dir="ltr">{c.code}</p>
                <p className="text-xs text-gray-500 truncate">
                  {describe(c)} · {c.scope === 'SITE' ? 'کل سایت' : c.eventTitle ? `«${c.eventTitle}»` : 'همه رویدادهای من'}
                  {' '}· استفاده: {pNum(c.usedCount)}{c.maxUses ? `/${pNum(c.maxUses)}` : ''}
                  {c.totalDiscount > 0 && <> · {formatToman(c.totalDiscount)} تخفیف داده شده</>}
                  {c.endsAt && <> · تا {new Date(c.endsAt).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' })}</>}
                </p>
              </div>
              <button onClick={() => toggle(c)} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${c.active ? 'bg-gray-100 dark:bg-white/10' : 'bg-emerald-600 text-white'}`}>{c.active ? 'غیرفعال کردن' : 'فعال کردن'}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
