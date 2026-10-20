import React, { useEffect, useRef, useState } from 'react';
import { Smartphone, ArrowRight, MessageSquare } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useAppData } from '../lib/appData';
import { api, ApiError, showToast } from '../lib/apiClient';
import { promptDialog } from '../lib/dialog';
import { normalizeIranMobile, toLatinDigits } from '../lib/phone';
import { pNum } from '../lib/format';

// Sign-in with an Iranian mobile number and a one-time SMS code.

export function PhoneLogin() {
  const { requestCode, verifyCode, config } = useAuth();
  const { setProfile } = useAppData();
  const codeLength = config?.codeLength ?? 6;
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const submittedCode = useRef('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Android Chrome can read the code from the SMS automatically (WebOTP). The SMS template
  // must end with "@<domain> #<code>" for this to trigger; otherwise it is simply skipped.
  useEffect(() => {
    if (step !== 'code' || !('OTPCredential' in window)) return;
    const ac = new AbortController();
    (navigator.credentials as any).get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((otp: any) => { if (otp?.code) setCode(String(otp.code).slice(0, codeLength)); })
      .catch(() => {});
    return () => ac.abort();
  }, [step]);

  const sendCode = async (target: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await requestCode(target);
      setPhone(target);
      setMaskedPhone(res.phone);
      setResendIn(res.resendIn);
      setDevCode(res.devCode || null);
      setCode('');
      submittedCode.current = '';
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      if (err instanceof ApiError && err.data?.retryAfter) setResendIn(Math.min(err.data.retryAfter, 3600));
      setError(err instanceof ApiError ? err.message : 'ارسال کد انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeIranMobile(phoneInput);
    if (!normalized) {
      setError('شماره موبایل را درست وارد کنید؛ مثل ۰۹۱۲۳۴۵۶۷۸۹');
      return;
    }
    sendCode(normalized);
  };

  const submitCode = async (value = code) => {
    if (!phone || value.length !== codeLength || busy || submittedCode.current === value) return;
    submittedCode.current = value;
    setBusy(true);
    setError(null);
    try {
      const { created } = await verifyCode(phone, value);
      if (created) {
        // Optional: a real name instead of the masked number shown by default.
        const name = await promptDialog({ title: 'به میونت خوش آمدید!', message: 'نام شما چیست؟ (برای برگزارکنندگان و دوستانتان نمایش داده می‌شود)', placeholder: 'نام و نام خانوادگی', confirmText: 'ذخیره', cancelText: 'بعداً' });
        if (name) {
          const me = await api<any>('/api/auth/me', { silent: true }).catch(() => null);
          if (me?.data?.id) {
            const saved = await api(`/api/users/${me.data.id}/profile`, { method: 'PUT', body: { name }, silent: true }).then(() => true, () => false);
            // The profile may already have been loaded with the default name; patch it in place.
            if (saved) setProfile(p => (p ? { ...p, name } : p));
            else showToast('ذخیره نام انجام نشد؛ می‌توانید از صفحه پروفایل آن را تغییر دهید.', 'error');
          }
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'بررسی کد انجام نشد.');
      submittedCode.current = '';
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  // Submit as soon as the last digit is typed (or pasted / auto-filled).
  useEffect(() => {
    if (code.length === codeLength) submitCode(code);
  }, [code]);

  const input = 'w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-lg outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-[#d9ff00]/40 text-center tracking-widest';

  if (step === 'phone') {
    return (
      <form onSubmit={submitPhone} className="w-full max-w-sm mx-auto space-y-3 text-right">
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="phone">
          <Smartphone className="inline w-4 h-4 ml-1" /> ورود یا ثبت‌نام با شماره موبایل
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          dir="ltr"
          placeholder="09123456789"
          value={phoneInput}
          onChange={(e) => { setPhoneInput(toLatinDigits(e.target.value)); setError(null); }}
          className={input}
          aria-invalid={!!error}
          aria-describedby="phone-error"
        />
        {error && <p id="phone-error" className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !phoneInput.trim()} className="w-full bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black py-3.5 rounded-xl font-bold disabled:opacity-50">
          {busy ? 'در حال ارسال...' : 'دریافت کد تأیید'}
        </button>
        <p className="text-xs text-gray-500 leading-relaxed">کد ورود با پیامک ارسال می‌شود. اگر حساب نداشته باشید، با همین شماره ساخته می‌شود.</p>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submitCode(); }} className="w-full max-w-sm mx-auto space-y-3 text-right">
      <button type="button" onClick={() => { setStep('phone'); setError(null); }} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
        <ArrowRight className="w-4 h-4" /> ویرایش شماره
      </button>
      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="otp">
        <MessageSquare className="inline w-4 h-4 ml-1" /> کد {pNum(codeLength)} رقمی ارسال‌شده به <span dir="ltr">{maskedPhone}</span>
      </label>
      <input
        id="otp"
        ref={codeRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        dir="ltr"
        maxLength={codeLength}
        placeholder={'•'.repeat(codeLength)}
        value={code}
        onChange={(e) => { setCode(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, codeLength)); setError(null); }}
        className={`${input} font-mono text-2xl`}
        aria-invalid={!!error}
        aria-describedby="otp-error"
      />
      {devCode && <p className="text-xs text-amber-600">محیط توسعه — کد: <span dir="ltr" className="font-mono">{devCode}</span></p>}
      {error && <p id="otp-error" className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={busy || code.length !== codeLength} className="w-full bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black py-3.5 rounded-xl font-bold disabled:opacity-50">
        {busy ? 'در حال بررسی...' : 'ورود'}
      </button>
      <div className="text-center text-sm">
        {resendIn > 0 ? (
          <span className="text-gray-500">ارسال دوباره کد تا {pNum(resendIn)} ثانیه دیگر</span>
        ) : (
          <button type="button" disabled={busy} onClick={() => phone && sendCode(phone)} className="font-bold text-teal-600 dark:text-[#d9ff00]">ارسال دوباره کد</button>
        )}
      </div>
    </form>
  );
}
