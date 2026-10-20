// Iranian mobile numbers, shared by the server and the client.
// Canonical form: +989XXXXXXXXX. Accepts Persian/Arabic digits, spaces, dashes and the
// usual prefixes: 09.., 9.., +989.., 00989.., 989...

const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, d => DIGIT_MAP[d] ?? d);
}

/** Returns +989XXXXXXXXX, or null when the input is not an Iranian mobile number. */
export function normalizeIranMobile(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let digits = toLatinDigits(input).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('0098')) digits = digits.slice(4);
  else if (digits.startsWith('98') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return /^9\d{9}$/.test(digits) ? `+98${digits}` : null;
}

/** 09123456789 — the form people recognise and the one SMS providers expect. */
export function toLocalMobile(canonical: string): string {
  return '0' + canonical.replace(/^\+98/, '');
}

/** ۰۹۱۲***۶۷۸۹ — for messages and default display names. */
export function maskMobile(canonical: string): string {
  const local = toLocalMobile(canonical);
  return (local.slice(0, 4) + '***' + local.slice(-4)).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}
