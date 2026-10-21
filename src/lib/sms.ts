import { toLocalMobile } from './phone.ts';
import { registerDependency, httpProbe, isUp, reportFailure, reportSuccess } from './dependencies.ts';

// SMS delivery through an Iranian provider. Every message goes through the provider's template
// ("verify"/"lookup") API: the fast lane that is not blocked by advertising filters and does not
// need a dedicated line. Each kind of message has its own template in the provider's panel.
//
//   SMS_PROVIDER=kavenegar   KAVENEGAR_API_KEY, KAVENEGAR_OTP_TEMPLATE, KAVENEGAR_TEMPLATE_<KIND>
//   SMS_PROVIDER=smsir       SMSIR_API_KEY, SMSIR_OTP_TEMPLATE_ID, SMSIR_TEMPLATE_<KIND> (template ids)
//   SMS_PROVIDER=console     development only: messages are printed to the server log
//
// When both providers have keys, the other one is used automatically whenever the chosen one is
// unreachable or refuses (e.g. out of credit). A message kind without a template is skipped.
//
// KAVENEGAR_BASE_URL / SMSIR_BASE_URL (or SMS_BASE_URL for both) override the provider host
// (egress proxy, or a local stub in tests).

export type SmsProvider = 'kavenegar' | 'smsir' | 'console';
type RealProvider = 'kavenegar' | 'smsir';

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
const hasKey = { kavenegar: Boolean(process.env.KAVENEGAR_API_KEY), smsir: Boolean(process.env.SMSIR_API_KEY) };

/** Providers to try, the chosen one first, then the other one if it has a key. */
const chain: RealProvider[] = smsProvider === 'console' || !smsProvider ? [] :
  ([smsProvider, smsProvider === 'kavenegar' ? 'smsir' : 'kavenegar'] as RealProvider[]).filter((p, i) => i === 0 || hasKey[p]);

if (chain.includes('kavenegar')) registerDependency('sms:kavenegar', 'پیامک کاوه‌نگار', httpProbe(`${KAVENEGAR_BASE}/`));
if (chain.includes('smsir')) registerDependency('sms:smsir', 'پیامک sms.ir', httpProbe(`${SMSIR_BASE}/`));

export class SmsError extends Error {}

// ---------------- provider calls ----------------

async function kavenegarLookup(phone: string, template: string, tokens: Record<string, string>) {
  const key = process.env.KAVENEGAR_API_KEY;
  if (!key) throw new SmsError('KAVENEGAR_API_KEY is not set');
  const params = new URLSearchParams({ receptor: toLocalMobile(phone), template, ...tokens });
  const res = await fetch(`${KAVENEGAR_BASE}/v1/${encodeURIComponent(key)}/verify/lookup.json?${params}`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || json?.return?.status !== 200) {
    throw new SmsError(`kavenegar: ${json?.return?.status ?? res.status} ${json?.return?.message ?? ''}`.trim());
  }
}

async function smsirVerify(phone: string, templateId: number, parameters: Record<string, string>) {
  const key = process.env.SMSIR_API_KEY;
  if (!key) throw new SmsError('SMSIR_API_KEY is not set');
  const res = await fetch(`${SMSIR_BASE}/v1/send/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/plain', 'x-api-key': key },
    body: JSON.stringify({ mobile: toLocalMobile(phone), templateId, parameters: Object.entries(parameters).map(([name, value]) => ({ name, value })) }),
    signal: AbortSignal.timeout(10000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || json?.status !== 1) {
    throw new SmsError(`sms.ir: ${json?.status ?? res.status} ${json?.message ?? ''}`.trim());
  }
}

/** Tries each provider (skipping ones known to be down unless none is left). */
async function withFailover(candidates: RealProvider[], send: (p: RealProvider) => Promise<void>): Promise<RealProvider> {
  const usable = candidates.filter(p => isUp(`sms:${p}`));
  let lastError: unknown = null;
  for (const provider of usable.length ? usable : candidates) {
    const started = Date.now();
    try {
      await send(provider);
      reportSuccess(`sms:${provider}`, Date.now() - started);
      return provider;
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

// ---------------- login codes ----------------

/** Sends a login/verification code through the first provider that works. */
export async function sendVerificationCode(phone: string, code: string) {
  if (smsProvider === 'console') {
    console.log(`[sms:console] verification code for ${toLocalMobile(phone)}: ${code}`);
    return;
  }
  const candidates = chain.filter(p => p === 'kavenegar' ? process.env.KAVENEGAR_OTP_TEMPLATE : process.env.SMSIR_OTP_TEMPLATE_ID);
  if (!candidates.length) throw new SmsError('no SMS provider configured');
  await withFailover(candidates, p => p === 'kavenegar'
    ? kavenegarLookup(phone, process.env.KAVENEGAR_OTP_TEMPLATE!, { token: code })
    : smsirVerify(phone, Number(process.env.SMSIR_OTP_TEMPLATE_ID), { CODE: code }));
}

// ---------------- notification messages ----------------

/**
 * Message kinds and their template parameters. Kavenegar tokens: token/token2/token3 take no spaces,
 * token10 up to 5 spaces and token20 up to 8. sms.ir parameters use the names below.
 */
export const SMS_KINDS = {
  TICKET: { kavenegar: { token: 'code', token10: 'title' }, smsir: { CODE: 'code', TITLE: 'title' } },
  REMINDER: { kavenegar: { token10: 'title', token20: 'when' }, smsir: { TITLE: 'title', WHEN: 'when' } },
  EVENT_CANCELLED: { kavenegar: { token10: 'title' }, smsir: { TITLE: 'title' } },
  EVENT_POSTPONED: { kavenegar: { token10: 'title', token20: 'when' }, smsir: { TITLE: 'title', WHEN: 'when' } },
  REFUND: { kavenegar: { token: 'amount', token10: 'title' }, smsir: { AMOUNT: 'amount', TITLE: 'title' } },
  WAITLIST: { kavenegar: { token: 'minutes', token10: 'title' }, smsir: { MINUTES: 'minutes', TITLE: 'title' } },
  TRANSFER: { kavenegar: { token10: 'title', token20: 'from' }, smsir: { TITLE: 'title', FROM: 'from' } },
} as const;
export type SmsKind = keyof typeof SMS_KINDS;

const SPACE_LIMIT: Record<string, number> = { token: 0, token2: 0, token3: 0, token10: 5, token20: 8 };

/** Fits a value into a Kavenegar token: spaces beyond the limit become no-break spaces. */
function fitToken(name: string, value: string) {
  const limit = SPACE_LIMIT[name] ?? 0;
  let seen = 0;
  return value.trim().replace(/\s+/g, () => (++seen <= limit ? ' ' : ' ')).slice(0, 100);
}

function templateFor(provider: RealProvider, kind: SmsKind) {
  return provider === 'kavenegar' ? process.env[`KAVENEGAR_TEMPLATE_${kind}`] : process.env[`SMSIR_TEMPLATE_${kind}`];
}

/** Whether any provider can send this kind of message (a template exists for it). */
export function smsKindEnabled(kind: SmsKind) {
  return smsProvider === 'console' || chain.some(p => templateFor(p, kind));
}

/**
 * Sends one templated message. Returns the provider used, 'console', or null when no provider
 * has a template for this kind (the message is then skipped). Throws SmsError on failure.
 */
export async function sendTemplateSms(phone: string, kind: SmsKind, params: Record<string, string>): Promise<string | null> {
  if (smsProvider === 'console') {
    console.log(`[sms:console] ${kind} to ${toLocalMobile(phone)}: ${JSON.stringify(params)}`);
    return 'console';
  }
  const candidates = chain.filter(p => templateFor(p, kind));
  if (!candidates.length) return null;
  return withFailover(candidates, provider => {
    const mapping = SMS_KINDS[kind][provider] as Record<string, string>;
    const values = Object.fromEntries(Object.entries(mapping).map(([slot, param]) =>
      [slot, provider === 'kavenegar' ? fitToken(slot, params[param] ?? '') : String(params[param] ?? '').slice(0, 100)]));
    return provider === 'kavenegar'
      ? kavenegarLookup(phone, templateFor(provider, kind)!, values)
      : smsirVerify(phone, Number(templateFor(provider, kind)), values);
  });
}
