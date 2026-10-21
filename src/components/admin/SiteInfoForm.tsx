import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { api, showToast } from '../../lib/apiClient';
import { loadSiteInfo, SiteInfo } from '../../lib/siteInfo';
import { EnamadSeal } from '../SiteFooter';

// Business details for the legal pages, contact page and Enamad seal.

const FIELDS: { key: keyof SiteInfo; label: string; dir?: 'ltr'; hint?: string; wide?: boolean }[] = [
  { key: 'brandName', label: 'نام تجاری' },
  { key: 'legalName', label: 'نام صاحب کسب‌وکار (شخص یا شرکت)', hint: 'همان نامی که در اینماد ثبت شده' },
  { key: 'nationalId', label: 'کد ملی / شناسه ملی', dir: 'ltr' },
  { key: 'phone', label: 'تلفن پشتیبانی', dir: 'ltr' },
  { key: 'email', label: 'ایمیل', dir: 'ltr' },
  { key: 'supportHours', label: 'ساعات پاسخگویی' },
  { key: 'address', label: 'نشانی', wide: true },
  { key: 'postalCode', label: 'کد پستی', dir: 'ltr' },
  { key: 'refundBusinessDays', label: 'مهلت بازپرداخت (روز کاری)', dir: 'ltr' },
  { key: 'enamadId', label: 'شناسه اینماد (id)', dir: 'ltr', hint: 'از کد نماد در پنل اینماد: عدد بعد از id=' },
  { key: 'enamadCode', label: 'کد اینماد (Code)', dir: 'ltr', hint: 'مقدار بعد از Code=' },
];

export function SiteInfoForm() {
  const [form, setForm] = useState<Partial<SiteInfo> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSiteInfo(true).then(i => i && setForm(i)); }, []);
  if (!form) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { rules, ...body } = form as SiteInfo;
      await api('/api/admin/site-info', { method: 'PUT', body });
      await loadSiteInfo(true);
      showToast('اطلاعات سایت ذخیره شد.', 'success');
    } catch { /* toast shown */ } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <h3 className="font-bold text-[#515739] dark:text-gray-100 flex items-center gap-2"><Building2 className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" /> اطلاعات کسب‌وکار و اینماد</h3>
      <p className="text-xs text-gray-500">در صفحات «تماس با ما»، «قوانین» و پایین سایت نمایش داده می‌شود. اینماد این اطلاعات را بررسی می‌کند.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <label key={f.key} className={`block ${f.wide ? 'md:col-span-2' : ''}`}>
            <span className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">{f.label}</span>
            <input
              dir={f.dir}
              value={String(form[f.key] ?? '')}
              onChange={e => setForm({ ...form, [f.key]: f.key === 'refundBusinessDays' ? Number(e.target.value.replace(/\D/g, '')) || '' : e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-[#18181b]"
            />
            {f.hint && <span className="block text-[11px] text-gray-400 mt-1">{f.hint}</span>}
          </label>
        ))}
      </div>
      {form.enamadId && form.enamadCode && (
        <div className="flex items-center gap-3 text-xs text-gray-500">پیش‌نمایش نماد: <EnamadSeal id={String(form.enamadId)} code={String(form.enamadCode)} /></div>
      )}
      <button disabled={saving} className="px-5 py-2.5 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold text-sm disabled:opacity-60">
        {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات سایت'}
      </button>
    </form>
  );
}
