import React, { useEffect, useState } from 'react';
import { X, Users, CreditCard, Star, AlertTriangle, ShieldCheck, TicketPercent } from 'lucide-react';
import { useAppData } from '../lib/appData';
import { api, ApiError, showToast } from '../lib/apiClient';
import { navigate } from '../lib/router';
import { formatToman, pNum } from '../lib/format';

interface PaymentConfig { mode: 'zarinpal' | 'simulated' | 'none'; pointValueToman: number; maxPointsShare: number; friendDiscount: number }

export function CheckoutModal() {
  const { checkoutEvent: event, closeCheckout, refreshLists, refreshProfile } = useAppData();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [points, setPoints] = useState(0);
  const [plusOne, setPlusOne] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    if (!event) return;
    setPlusOne(false);
    setUsePoints(false);
    setCoupon(null);
    setCouponInput('');
    setCouponError(null);
    api<{ data: PaymentConfig }>('/api/payments/config', { silent: true }).then(d => setConfig(d.data)).catch(() => {});
    api<{ data: { points: number } }>('/api/users/me/points', { silent: true }).then(d => setPoints(d.data.points)).catch(() => {});
  }, [event?.id]);

  // The discount depends on the subtotal: check the code again when "+1" changes.
  useEffect(() => {
    if (coupon && event) applyCoupon(coupon.code);
  }, [plusOne]);

  const applyCoupon = async (code = couponInput) => {
    if (!event || !code.trim()) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const res = await api<{ data: { code: string; discount: number } }>('/api/coupons/preview', { body: { code, eventId: event.id, plusOne }, silent: true });
      setCoupon(res.data);
      setCouponInput(res.data.code);
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : 'بررسی کد انجام نشد.');
    } finally {
      setCheckingCoupon(false);
    }
  };

  if (!event) return null;

  // Same arithmetic as the server (which is the source of truth for the charged amount).
  const friendPrice = Math.round(event.cost * (1 - (config?.friendDiscount ?? 0.1)));
  const subtotal = event.cost + (plusOne ? friendPrice : 0);
  const couponDiscount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const pointValue = config?.pointValueToman ?? 10;
  const usablePoints = Math.max(0, Math.min(points, Math.floor(((subtotal - couponDiscount) * (config?.maxPointsShare ?? 0.5)) / pointValue)));
  const discount = usePoints ? usablePoints * pointValue : 0;
  const total = subtotal - couponDiscount - discount;
  const unavailable = config?.mode === 'none';

  const pay = async () => {
    setSubmitting(true);
    try {
      const res = await api<any>('/api/orders', { body: { eventId: event.id, plusOne, usePoints, couponCode: coupon?.code } });
      if (res.paymentUrl) {
        // Off to the gateway; it sends the user back to /tickets with the result.
        window.location.href = res.paymentUrl;
        return;
      }
      showToast(plusOne ? 'بلیت شما و دوستتان صادر شد!' : 'بلیت شما صادر شد!', 'success');
      refreshLists();
      refreshProfile();
      closeCheckout();
      navigate('/tickets');
    } catch (err) {
      // error toast already shown; a code that stopped being valid is cleared
      if (err instanceof ApiError && err.data?.code === 'COUPON_INVALID') { setCoupon(null); setCouponError(err.message); }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210] flex flex-col justify-end md:items-center md:justify-center" onClick={closeCheckout} role="dialog" aria-modal="true" dir="rtl">
      <div className="bg-white dark:bg-[#18181b] w-full md:w-[420px] rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#515739] dark:text-gray-100">خرید بلیت</h3>
          <button onClick={closeCheckout} aria-label="بستن" className="w-8 h-8 bg-teal-50 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-100 dark:bg-[#1f1f23] rounded-2xl p-4 border border-gray-200 dark:border-white/10 mb-4">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 truncate">{event.title}</h4>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">قیمت هر بلیت:</span>
            <span className="font-bold text-teal-600 dark:text-[#d9ff00]">{formatToman(event.cost)}</span>
          </div>
          {typeof event.seatsLeft === 'number' && (
            <p className="text-xs text-gray-500 mt-2">{pNum(event.seatsLeft)} جای خالی باقی مانده</p>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer bg-teal-600/10 dark:bg-[#d9ff00]/10 border border-teal-600/20 dark:border-[#d9ff00]/20 rounded-2xl p-4 mb-3">
          <input type="checkbox" className="mt-1 w-5 h-5" checked={plusOne} onChange={(e) => setPlusOne(e.target.checked)} />
          <span>
            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Users className="w-4 h-4" /> خرید برای دوست (+۱)</span>
            <span className="block text-xs text-teal-700 dark:text-[#d9ff00] mt-1 leading-relaxed">بلیت دوم {pNum(Math.round((config?.friendDiscount ?? 0.1) * 100))}٪ تخفیف دارد و ۲۰ امتیاز جایزه می‌گیرید.</span>
          </span>
        </label>

        <label className={`flex items-start gap-3 rounded-2xl p-4 mb-5 border ${usablePoints > 0 ? 'cursor-pointer bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'opacity-60 border-gray-200 dark:border-white/10'}`}>
          <input type="checkbox" className="mt-1 w-5 h-5" disabled={usablePoints === 0} checked={usePoints && usablePoints > 0} onChange={(e) => setUsePoints(e.target.checked)} />
          <span>
            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> استفاده از امتیازها</span>
            <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              {usablePoints > 0
                ? `${pNum(usablePoints)} امتیاز = ${formatToman(usablePoints * pointValue)} تخفیف (موجودی: ${pNum(points)})`
                : `موجودی امتیاز شما ${pNum(points)} است. هر امتیاز ${pNum(pointValue)} تومان ارزش دارد.`}
            </span>
          </span>
        </label>

        <form onSubmit={(e) => { e.preventDefault(); applyCoupon(); }} className="mb-5">
          <div className="flex gap-2">
            <input
              value={couponInput}
              onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); if (coupon) setCoupon(null); }}
              placeholder="کد تخفیف"
              aria-label="کد تخفیف"
              dir="ltr"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1f1f23] text-sm font-mono uppercase"
            />
            <button disabled={!couponInput.trim() || checkingCoupon} className="px-4 rounded-xl bg-gray-100 dark:bg-white/10 text-sm font-bold disabled:opacity-50 flex items-center gap-1">
              <TicketPercent className="w-4 h-4" /> {checkingCoupon ? '...' : 'اعمال'}
            </button>
          </div>
          {couponError && <p className="text-xs text-red-600 mt-1.5" role="alert">{couponError}</p>}
          {coupon && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5">کد {coupon.code} اعمال شد: {formatToman(couponDiscount)} تخفیف</p>}
        </form>

        <div className="space-y-1.5 text-sm mb-5 px-1">
          <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">جمع</span><span>{formatToman(subtotal)}</span></div>
          {couponDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>کد تخفیف</span><span>−{formatToman(couponDiscount)}</span></div>}
          {discount > 0 && <div className="flex justify-between text-amber-600"><span>تخفیف امتیاز</span><span>−{formatToman(discount)}</span></div>}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/10">
            <span className="font-medium text-gray-700 dark:text-gray-300">مبلغ قابل پرداخت</span>
            <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{total === 0 ? 'رایگان' : formatToman(total)}</span>
          </div>
        </div>

        {config?.mode === 'simulated' && (
          <p className="text-xs bg-yellow-50 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 rounded-xl p-3 mb-4 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> محیط آزمایشی: پرداخت واقعی انجام نمی‌شود و بلیت بلافاصله صادر می‌شود.
          </p>
        )}
        {unavailable && (
          <p className="text-xs bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 rounded-xl p-3 mb-4">درگاه پرداخت هنوز فعال نشده است. لطفاً بعداً تلاش کنید.</p>
        )}

        <button
          onClick={pay}
          disabled={submitting || unavailable || !config}
          className="w-full py-4 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold rounded-xl shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CreditCard className="w-5 h-5" />}
          {submitting ? 'در حال اتصال به درگاه...' : total === 0 ? 'دریافت بلیت' : 'پرداخت آنلاین'}
        </button>
        <p className="text-[11px] text-gray-500 mt-3 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> لغو بلیت تا ۲ ساعت پیش از شروع رویداد امکان‌پذیر است؛
          <a href="/refund-policy" onClick={(e) => { e.preventDefault(); closeCheckout(); navigate('/refund-policy'); }} className="text-teal-600 dark:text-[#d9ff00] font-bold">شرایط بازپرداخت</a>
        </p>
      </div>
    </div>
  );
}
