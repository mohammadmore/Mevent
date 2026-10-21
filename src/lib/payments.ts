// Payment gateway integration (Zarinpal v4).
//
// Configuration:
//   ZARINPAL_MERCHANT_ID   merchant id; enables the real gateway
//   ZARINPAL_SANDBOX=true  use Zarinpal's sandbox
//   PAYMENT_ALLOW_SIMULATED=true  allow instant fake payments (always allowed outside production)
// Without a gateway in production, paid tickets cannot be bought (a clear error is shown).

import { registerDependency, httpProbe, isUp, reportFailure, reportSuccess } from './dependencies.ts';

const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || '';
const SANDBOX = process.env.ZARINPAL_SANDBOX === 'true';
// ZARINPAL_BASE_URL overrides the host (e.g. an egress proxy, or a local stub in tests).
const HOST = (process.env.ZARINPAL_BASE_URL || (SANDBOX ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com')).replace(/\/$/, '');

export type GatewayMode = 'zarinpal' | 'simulated' | 'none';

export const gatewayMode: GatewayMode = MERCHANT_ID
  ? 'zarinpal'
  : (process.env.NODE_ENV !== 'production' || process.env.PAYMENT_ALLOW_SIMULATED === 'true') ? 'simulated' : 'none';

if (gatewayMode === 'simulated') {
  console.warn('Payments run in SIMULATED mode: paid tickets are confirmed without charging anyone.');
}

/** Zarinpal works in Rial; event prices are stored in Toman (IRT) or Rial (IRR). */
export function toRial(amount: number, currency: string | null | undefined): number {
  const cur = (currency || 'IRT').toUpperCase();
  if (cur === 'IRR') return amount;
  if (cur === 'IRT') return amount * 10;
  throw new Error(`پرداخت با واحد پول ${cur} پشتیبانی نمی‌شود.`);
}

export const PAYMENT_DEPENDENCY = 'zarinpal';
if (gatewayMode === 'zarinpal') registerDependency(PAYMENT_DEPENDENCY, 'درگاه پرداخت زرین‌پال', httpProbe(`${HOST}/`));

/** Whether a new payment can be started right now (known reachable or not yet checked). */
export const gatewayAvailable = () => gatewayMode !== 'zarinpal' || isUp(PAYMENT_DEPENDENCY);

async function post(path: string, body: unknown) {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${HOST}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    reportFailure(PAYMENT_DEPENDENCY, err);
    throw err;
  }
  // Any answer (even a refusal) means the gateway is reachable.
  if (res.status >= 500) reportFailure(PAYMENT_DEPENDENCY, new Error(`HTTP ${res.status}`));
  else reportSuccess(PAYMENT_DEPENDENCY, Date.now() - started);
  const json: any = await res.json().catch(() => ({}));
  return json;
}

export async function requestPayment(opts: { amountRial: number; description: string; callbackUrl: string; mobile?: string; email?: string }) {
  const json = await post('/pg/v4/payment/request.json', {
    merchant_id: MERCHANT_ID,
    amount: opts.amountRial,
    callback_url: opts.callbackUrl,
    description: opts.description.slice(0, 250),
    metadata: { email: opts.email, mobile: opts.mobile },
  });
  const data = json?.data;
  if (!data || data.code !== 100 || !data.authority) {
    const message = json?.errors?.message || 'اتصال به درگاه پرداخت ناموفق بود.';
    throw new Error(message);
  }
  return { authority: String(data.authority), paymentUrl: `${HOST}/pg/StartPay/${data.authority}` };
}

export async function verifyPayment(opts: { amountRial: number; authority: string }) {
  const json = await post('/pg/v4/payment/verify.json', {
    merchant_id: MERCHANT_ID,
    amount: opts.amountRial,
    authority: opts.authority,
  });
  const data = json?.data;
  // 100 = verified now, 101 = already verified earlier (e.g. the user refreshed the callback page)
  if (data && (data.code === 100 || data.code === 101)) {
    return { ok: true as const, refId: String(data.ref_id ?? '') };
  }
  return { ok: false as const, message: json?.errors?.message || 'پرداخت تأیید نشد.' };
}
