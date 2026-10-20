import { toLocalMobile } from './phone.ts';

// SMS delivery through an Iranian provider. Verification codes go through the provider's
// template ("verify"/"lookup") API, which is the fast lane that is not blocked by
// advertising filters and does not require a dedicated line.
//
//   SMS_PROVIDER=kavenegar   KAVENEGAR_API_KEY, KAVENEGAR_OTP_TEMPLATE (template with %token)
//   SMS_PROVIDER=smsir       SMSIR_API_KEY, SMSIR_OTP_TEMPLATE_ID (template parameter: CODE)
//   SMS_PROVIDER=console     development only: the code is printed to the server log
//
// SMS_BASE_URL overrides the provider host (egress proxy, or a local stub in tests).

export type SmsProvider = 'kavenegar' | 'smsir' | 'console';

const PROVIDER = (process.env.SMS_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'console')) as SmsProvider | '';

export const smsProvider: SmsProvider | null = PROVIDER === 'kavenegar' || PROVIDER === 'smsir' || PROVIDER === 'console' ? PROVIDER : null;

if (smsProvider === 'console' && process.env.NODE_ENV === 'production') {
  console.warn('SMS_PROVIDER=console in production: login codes are only written to the server log.');
}
if (!smsProvider) {
  console.warn('SMS_PROVIDER is not configured: phone login is disabled.');
}

export class SmsError extends Error {}

async function sendWithKavenegar(phone: string, code: string) {
  const key = process.env.KAVENEGAR_API_KEY;
  const template = process.env.KAVENEGAR_OTP_TEMPLATE;
  if (!key || !template) throw new SmsError('KAVENEGAR_API_KEY / KAVENEGAR_OTP_TEMPLATE are not set');
  const base = process.env.SMS_BASE_URL || 'https://api.kavenegar.com';
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
  const base = process.env.SMS_BASE_URL || 'https://api.sms.ir';
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

/** Sends a login/verification code. Throws SmsError when the provider refuses. */
export async function sendVerificationCode(phone: string, code: string) {
  switch (smsProvider) {
    case 'kavenegar': return sendWithKavenegar(phone, code);
    case 'smsir': return sendWithSmsIr(phone, code);
    case 'console':
      console.log(`[sms:console] verification code for ${toLocalMobile(phone)}: ${code}`);
      return;
    default:
      throw new SmsError('no SMS provider configured');
  }
}
