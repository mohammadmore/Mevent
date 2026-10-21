import React, { useEffect, useState } from 'react';
import { BadgeCheck, ShieldAlert, Clock, Upload, FileCheck2 } from 'lucide-react';
import { api, ApiError, showToast } from '../lib/apiClient';
import { navigate } from '../lib/router';
import { isValidNationalId, isValidCompanyId, isValidSheba } from '../lib/iranIds';

// Organizer identity verification: needed before selling paid tickets.

interface KycState {
  status: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  type: 'INDIVIDUAL' | 'COMPANY' | null;
  data: Record<string, string> | null;
  note: string | null;
  phoneVerified: boolean;
}

const input = 'w-full px-3 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm bg-white dark:bg-[#18181b] outline-none focus:ring-2 focus:ring-teal-600/40';

function Field({ label, error, children }: { label: string; error?: string | false; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">{label}</span>
      {children}
      {error && <span className="block text-[11px] text-red-600 mt-1" role="alert">{error}</span>}
    </label>
  );
}

function DocUpload({ label, value, onChange }: { label: string; value: string; onChange: (name: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api<{ data: { name: string } }>('/api/kyc/documents', { body: fd });
      onChange(res.data.name);
    } catch { /* toast shown */ } finally {
      setBusy(false);
    }
  };
  return (
    <label className={`flex items-center gap-3 p-3 rounded-xl border border-dashed cursor-pointer ${value ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-300 dark:border-white/20'}`}>
      {value ? <FileCheck2 className="w-5 h-5 text-emerald-600" /> : <Upload className="w-5 h-5 text-gray-500" />}
      <span className="flex-1 text-sm">
        <span className="block font-bold">{label}</span>
        <span className="text-xs text-gray-500">{busy ? 'در حال بارگذاری...' : value ? 'بارگذاری شد (برای تعویض دوباره انتخاب کنید)' : 'تصویر یا PDF، حداکثر ۵ مگابایت'}</span>
      </span>
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
    </label>
  );
}

export function KycCard() {
  const [kyc, setKyc] = useState<KycState | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [f, setF] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => api<{ data: KycState }>('/api/kyc/me', { silent: true }).then(d => {
    setKyc(d.data);
    if (d.data.type) setType(d.data.type);
    if (d.data.data) setF(d.data.data);
  }).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!kyc) return null;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const err = (cond: boolean, msg: string) => touched && cond && msg;

  if (kyc.status === 'VERIFIED') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-4 py-3">
        <BadgeCheck className="w-5 h-5" /> برگزارکننده احرازشده؛ فروش بلیت پولی فعال است.
      </div>
    );
  }
  if (kyc.status === 'PENDING') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-3">
        <Clock className="w-5 h-5" /> مدارک احراز هویت شما در حال بررسی است. نتیجه با اعلان و پیامک اطلاع داده می‌شود.
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSending(true);
    try {
      const res = await api<{ data: KycState; message: string }>('/api/kyc', { body: { type, ...f } });
      setKyc(res.data);
      setOpen(false);
      showToast(res.message, 'success');
    } catch (error) {
      if (error instanceof ApiError && error.data?.code === 'PHONE_REQUIRED') navigate('/profile');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-bold text-gray-900 dark:text-gray-100">احراز هویت برگزارکننده</p>
          <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed mt-1">
            برای فروش بلیت پولی لازم است. رویدادهای رایگان بدون آن هم قابل ثبت‌اند.
          </p>
          {kyc.status === 'REJECTED' && kyc.note && <p className="text-xs text-red-600 mt-2">مدارک قبلی تأیید نشد: {kyc.note}</p>}
          {!kyc.phoneVerified && <p className="text-xs text-red-600 mt-2">ابتدا شماره موبایل خود را در صفحه پروفایل به حساب وصل کنید.</p>}
        </div>
        {!open && <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold shrink-0">{kyc.status === 'REJECTED' ? 'اصلاح مدارک' : 'شروع'}</button>}
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2" role="radiogroup" aria-label="نوع برگزارکننده">
            {(['INDIVIDUAL', 'COMPANY'] as const).map(t => (
              <button type="button" key={t} role="radio" aria-checked={type === t} onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold ${type === t ? 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black' : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10'}`}>
                {t === 'INDIVIDUAL' ? 'شخص حقیقی' : 'شرکت / مؤسسه'}
              </button>
            ))}
          </div>

          {type === 'INDIVIDUAL' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="نام و نام خانوادگی (مطابق کارت ملی)" error={err((f.fullName || '').trim().length < 5, 'نام کامل را وارد کنید')}><input className={input} value={f.fullName || ''} onChange={set('fullName')} /></Field>
              <Field label="کد ملی" error={err(!isValidNationalId(f.nationalId || ''), 'کد ملی معتبر نیست')}><input className={input} dir="ltr" inputMode="numeric" value={f.nationalId || ''} onChange={set('nationalId')} /></Field>
              <Field label="تاریخ تولد (شمسی)" error={err(!/^1[34]\d{2}\/\d{1,2}\/\d{1,2}$/.test((f.birthDate || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))), 'مثل ۱۳۷۰/۰۱/۳۱')}><input className={input} dir="ltr" placeholder="1370/01/31" value={f.birthDate || ''} onChange={set('birthDate')} /></Field>
              <Field label="شماره شبا (اختیاری، برای تسویه)" error={err(!!f.sheba && !isValidSheba(f.sheba), 'شبا معتبر نیست')}><input className={input} dir="ltr" placeholder="IR..." value={f.sheba || ''} onChange={set('sheba')} /></Field>
              <div className="sm:col-span-2"><DocUpload label="تصویر کارت ملی" value={f.idCardImage || ''} onChange={n => setF({ ...f, idCardImage: n })} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="نام ثبتی شرکت" error={err((f.companyName || '').trim().length < 3, 'نام شرکت را وارد کنید')}><input className={input} value={f.companyName || ''} onChange={set('companyName')} /></Field>
              <Field label="شناسه ملی شرکت (۱۱ رقم)" error={err(!isValidCompanyId(f.companyId || ''), 'شناسه ملی معتبر نیست')}><input className={input} dir="ltr" inputMode="numeric" value={f.companyId || ''} onChange={set('companyId')} /></Field>
              <Field label="شماره ثبت"><input className={input} dir="ltr" inputMode="numeric" value={f.registrationNumber || ''} onChange={set('registrationNumber')} /></Field>
              <Field label="نام مدیرعامل"><input className={input} value={f.ceoName || ''} onChange={set('ceoName')} /></Field>
              <Field label="کد ملی مدیرعامل" error={err(!isValidNationalId(f.ceoNationalId || ''), 'کد ملی معتبر نیست')}><input className={input} dir="ltr" inputMode="numeric" value={f.ceoNationalId || ''} onChange={set('ceoNationalId')} /></Field>
              <Field label="شماره شبا شرکت (اختیاری)" error={err(!!f.sheba && !isValidSheba(f.sheba), 'شبا معتبر نیست')}><input className={input} dir="ltr" placeholder="IR..." value={f.sheba || ''} onChange={set('sheba')} /></Field>
              <div className="sm:col-span-2"><DocUpload label="آگهی آخرین تغییرات در روزنامه رسمی" value={f.gazetteImage || ''} onChange={n => setF({ ...f, gazetteImage: n })} /></div>
            </div>
          )}

          <p className="text-[11px] text-gray-500">مدارک فقط برای بررسی مدیران سامانه قابل مشاهده است.</p>
          <div className="flex gap-2">
            <button disabled={sending || !kyc.phoneVerified} className="px-5 py-2.5 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold disabled:opacity-50">{sending ? 'در حال ارسال...' : 'ارسال برای بررسی'}</button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-gray-600">انصراف</button>
          </div>
        </form>
      )}
    </div>
  );
}
