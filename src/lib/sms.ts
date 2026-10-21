import { toLocalMobile } from './phone.ts';
import { registerDependency, httpProbe, isUp, reportFailure, reportSuccess } from './dependencies.ts';

// SMS delivery through an Iranian provider. Verification codes go through the provider's
// template ("verify"/"lookup") API, which is the fast lane that is not blocked by
// advertising filters and does not require a dedicated line.
//
//   SMS_PROVIDER=kavenegar   KAVENEGAR_API_KEY, KAVENEGAR_OTP_TEMPLATE (template with %token)
//   SMS_PROVIDER=smsir       SMSIR_API_KEY, SMSIR_OTP_TEMPLATE_ID (template parameter: CODE)
//   SMS_PROVIDER=console     development only: the code is printed to the server log
//
// When both providers have keys, the other one is used automatically whenever the chosen one is
// unreachable or refuses (e.g. out of credit).
//
// KAVENEGAR_BASE_URL / SMSIR_BASE_URL (or SMS_BASE_URL for both) override the provider host
// (egress proxy, or a local stub in tests).

export type SmsProvider = 'kavenegar' | 'smsir' | 'console';

const PROVIDER = (process.env.SMS_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'console')) as SmsProvider | '';

export const smsProvider: SmsProvider | null = PROVIDER === 'kavenegar' || PROVIDER === 'smsir' || PROVIDER === 'console' ? PROVIDER : null;

if (smsProvider === 'console' && process.env.NODE_ENV === 'production') {
  console.warn('SMS_PROVIDER=console in production: login codes are only written to the server log.');
}
if (!smsProvider) {
  console.warn('SMS_PROVIDER is not configured: phone login is disabled.');
}

const KAVENEGAR_BASE = process.env.KAVENEGAR_BASE_URL || process.env.SMS_BASE_URL || 'https://api.kavenegar.com';
const SMSIR_BASE = process.env.SMSIR_BASE_URL || process.env.SMS_BASE_URL || 'https://api.sms.ir';
const configured = {
  kavenegar: Boolean(process.env.KAVENEGAR_API_KEY && process.env.KAVENEGAR_OTP_TEMPLATE),
  smsir: Boolean(process.env.SMSIR_API_KEY && process.env.SMSIR_OTP_TEMPLATE_ID),
};

/** Providers to try, the chosen one first. */
const chain: ('kavenegar' | 'smsir')[] = smsProvider === 'console' || !smsProvider ? [] :
  [smsProvider, smsProvider === 'kavenegar' ? 'smsir' : 'kavenegar'].filter((p, i) => i === 0 || configured[p as 'kavenegar' | 'smsir']) as ('kavenegar' | 'smsir')[];

if (chain.includes('kavenegar')) registerDependency('sms:kavenegar', 'پیامک کاوه‌نگار', httpProbe(`${KAVENEGAR_BASE}/`));
if (chain.includes('smsir')) registerDependency('sms:smsir', 'پیامک sms.ir', httpProbe(`${SMSIR_BASE}/`));

export class SmsError extends Error {}

async function sendWithKavenegar(phone: string, code: string) {
  const key = process.env.KAVENEGAR_API_KEY;
  const template = process.env.KAVENEGAR_OTP_TEMPLATE;
  if (!key || !template) throw new SmsError('KAVENEGAR_API_KEY / KAVENEGAR_OTP_TEMPLATE are not set');
  const base = KAVENEGAR_BASE;
  const params = new URLSearchParams({ receptor: toLocalMobile(phone), token: code, template });
  const res = await fetch(`${base}/v1/${encodeURIComponent(key)}/verify/lookup.json?${params}`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || json?.return?.status !== 200) {
    throw new SmsError(`kavenegar: ${json?.return?.status ?? res.status} ${json?.return?.message ?? ''}`.trim());
  }
}

async function sendWithSmsIr(phone: string, code: string) {
  const key = process.env.SMSIR_API_KEY;
  const templateId = Number(process.env.SMSIR_OTP_TEMPLATE_ID);
  if (!key || !templateId) throw new SmsError('SMSIR_API_KEY / SMSIR_OTP_TEMPLATE_ID are not set');
  const base = SMSIR_BASE;
  const res = await fetch(`${base}/v1/send/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/plain', 'x-api-key': key },
    body: JSON.stringify({ mobile: toLocalMobile(phone), templateId, parameters: [{ name: 'CODE', value: code }] }),
    signal: AbortSignal.timeout(10000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || json?.status !== 1) {
    throw new SmsError(`sms.ir: ${json?.status ?? res.status} ${json?.message ?? ''}`.trim());
  }
}

const senders = { kavenegar: sendWithKavenegar, smsir: sendWithSmsIr };

/**
 * Sends a login/verification code through the first provider that works. Providers known to be
 * down are skipped without waiting (the last one is still tried). Throws SmsError if none could.
 */
export async function sendVerificationCode(phone: string, code: string) {
  if (smsProvider === 'console') {
    console.log(`[sms:console] verification code for ${toLocalMobile(phone)}: ${code}`);
    return;
  }
  if (!chain.length) throw new SmsError('no SMS provider configured');
  const usable = chain.filter(p => isUp(`sms:${p}`));
  let lastError: unknown = null;
  for (const provider of usable.length ? usable : chain) {
    const started = Date.now();
    try {
      await senders[provider](phone, code);
      reportSuccess(`sms:${provider}`, Date.now() - started);
      return;
    } catch (err) {
      lastError = err;
      // A refusal (bad number, no credit) still means the service answered; only network
      // trouble marks it down. Either way the next provider gets a try.
      if (err instanceof SmsError) reportSuccess(`sms:${provider}`, Date.now() - started);
      else reportFailure(`sms:${provider}`, err);
      console.warn(`SMS via ${provider} failed:`, (err as Error)?.message || err);
    }
  }
  throw lastError instanceof SmsError ? lastError : new SmsError(String((lastError as Error)?.message || lastError));
}
